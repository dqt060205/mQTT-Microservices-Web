import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentService } from '../src/services/payment.service.js';
import { createDemoProvider } from '../src/providers/demo.provider.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const silent = { error() {} };
const noSleep = async () => {};
const alice = { id: 'alice', role: 'user' };
const bob = { id: 'bob', role: 'user' };
const admin = { id: 'root', role: 'admin' };

function setup(providerOptions = {}) {
  const prisma = createFakePrisma();
  const provider = createDemoProvider({ delayMs: 0, sleep: noSleep, ...providerOptions });
  return { prisma, service: createPaymentService({ prisma, provider, logger: silent }) };
}

const reject = (promise, code) =>
  assert.rejects(promise, (error) => error.code === code, 'expected ' + code);

test('a payment succeeds and is stored; internal fields are not exposed', async () => {
  const { prisma, service } = setup();
  const { payment, created } = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50 });

  assert.equal(created, true);
  assert.equal(payment.status, 'SUCCESS');
  assert.equal(payment.amount, 50);
  assert.equal(prisma.rows.length, 1);
  assert.equal('providerRef' in payment, false);
  assert.equal('idempotencyKey' in payment, false);
  assert.match(prisma.rows[0].providerRef, /^demo_/);
});

test('the same Idempotency-Key replays the stored result and never charges twice', async () => {
  const { prisma, service } = setup();
  const input = { userId: 'alice', orderId: 'o1', amount: 50, idempotencyKey: 'key-0000001' };
  const first = await service.createPayment(input);
  const second = await service.createPayment(input);

  assert.equal(second.created, false);
  assert.equal(second.payment.id, first.payment.id);
  assert.equal(prisma.rows.length, 1);
});

test('reusing an Idempotency-Key for something else is a conflict', async () => {
  const { service } = setup();
  await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50, idempotencyKey: 'key-0000001' });

  await reject(
    service.createPayment({ userId: 'alice', orderId: 'o1', amount: 60, idempotencyKey: 'key-0000001' }),
    'IDEMPOTENCY_KEY_REUSED'
  );
  await reject(
    service.createPayment({ userId: 'bob', orderId: 'o1', amount: 50, idempotencyKey: 'key-0000001' }),
    'IDEMPOTENCY_KEY_REUSED'
  );
});

test('an order is paid only once', async () => {
  const { prisma, service } = setup();
  const first = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50 });
  const again = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50 });

  assert.equal(again.created, false);
  assert.equal(again.payment.id, first.payment.id);
  assert.equal(prisma.rows.length, 1);

  await reject(service.createPayment({ userId: 'bob', orderId: 'o1', amount: 50 }), 'ORDER_ALREADY_PAID');
  await reject(service.createPayment({ userId: 'alice', orderId: 'o1', amount: 5 }), 'ORDER_ALREADY_PAID');
});

test('declined payment is recorded as FAILED and does not block a retry', async () => {
  const { prisma, service } = setup({ maxAmount: 100 });
  const declined = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 500 });
  assert.equal(declined.payment.status, 'FAILED');
  assert.equal(declined.payment.failureReason, 'AMOUNT_LIMIT_EXCEEDED');

  const retry = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50 });
  assert.equal(retry.payment.status, 'SUCCESS');
  assert.equal(prisma.rows.length, 2);
});

test('random decline follows the configured rate', async () => {
  const always = setup({ failRate: 1 });
  assert.equal((await always.service.createPayment({ userId: 'a', orderId: 'o1', amount: 1 })).payment.status, 'FAILED');
  const never = setup({ failRate: 0.5, random: () => 0.9 });
  assert.equal((await never.service.createPayment({ userId: 'a', orderId: 'o1', amount: 1 })).payment.status, 'SUCCESS');
});

test('a crashing provider produces a FAILED payment instead of a 500', async () => {
  const prisma = createFakePrisma();
  const provider = {
    name: 'broken',
    async charge() {
      throw new Error('bank is down');
    },
    async refund() {}
  };
  const service = createPaymentService({ prisma, provider, logger: silent });
  const { payment } = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 5 });

  assert.equal(payment.status, 'FAILED');
  assert.equal(payment.failureReason, 'PROVIDER_ERROR');
});

test('owners see their payments, others get 404, admins see everything', async () => {
  const { service } = setup();
  const { payment } = await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 5 });

  assert.equal((await service.getPayment({ id: payment.id, user: alice })).id, payment.id);
  assert.equal((await service.getPayment({ id: payment.id, user: admin })).id, payment.id);
  await reject(service.getPayment({ id: payment.id, user: bob }), 'PAYMENT_NOT_FOUND');
});

test('listing is scoped to the caller unless admin', async () => {
  const { service } = setup();
  await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 5 });
  await service.createPayment({ userId: 'bob', orderId: 'o2', amount: 7 });

  const mine = await service.listPayments({ user: alice, limit: 20, offset: 0 });
  assert.equal(mine.pagination.total, 1);
  assert.equal(mine.data[0].orderId, 'o1');

  const all = await service.listPayments({ user: admin, limit: 20, offset: 0 });
  assert.equal(all.pagination.total, 2);

  const filtered = await service.listPayments({ user: admin, orderId: 'o2', limit: 20, offset: 0 });
  assert.equal(filtered.data.length, 1);
});

test('refund: SUCCESS -> REFUNDED, repeatable, and only for successful payments', async () => {
  const { service } = setup({ maxAmount: 100 });
  const ok = (await service.createPayment({ userId: 'alice', orderId: 'o1', amount: 50 })).payment;
  const failed = (await service.createPayment({ userId: 'alice', orderId: 'o2', amount: 500 })).payment;

  const refunded = await service.refundPayment({ id: ok.id });
  assert.equal(refunded.status, 'REFUNDED');
  assert.ok(refunded.refundedAt);
  assert.equal((await service.refundPayment({ id: ok.id })).status, 'REFUNDED');

  await reject(service.refundPayment({ id: failed.id }), 'PAYMENT_NOT_REFUNDABLE');
  await reject(service.refundPayment({ id: '3f2b8c1e-6a4d-4e0b-9d57-1c2a3b4c5d6e' }), 'PAYMENT_NOT_FOUND');
});
