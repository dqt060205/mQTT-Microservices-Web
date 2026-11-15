import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { buildApp } from '../src/app.js';
import { createFakePrisma } from './helpers/fake-prisma.js';

const SECRET = 'test-secret-test-secret-test-secret';
const config = { demoDelayMs: 0, demoFailRate: 0, demoMaxAmount: null };

let server;
let base;
let prisma;

const tokenFor = (claims, secret = SECRET) => jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: '1h' });
const userToken = tokenFor({ sub: 'user-1', role: 'USER' });
const adminToken = tokenFor({ sub: 'admin-1', role: 'ADMIN' });

async function call(method, path, { token, body, headers = {}, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body))
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

before(async () => {
  prisma = createFakePrisma();
  const app = buildApp({ prisma, jwtSecret: SECRET, config, logger: { error() {} }, corsOrigin: '' });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + server.address().port;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('health and readiness are public', async () => {
  assert.equal((await call('GET', '/health')).status, 200);
  assert.equal((await call('GET', '/ready')).status, 200);
});

test('creating a payment needs a valid token', async () => {
  const body = { orderId: 'o-auth', amount: 10 };
  const none = await call('POST', '/api/payments', { body });
  assert.equal(none.status, 401);
  assert.equal(none.body.success, false);
  assert.equal(typeof none.body.message, 'string'); // read by order-service's http client

  assert.equal((await call('POST', '/api/payments', { body, token: 'garbage' })).status, 401);
  assert.equal((await call('POST', '/api/payments', { body, token: tokenFor({ sub: 'u' }, 'other-secret') })).status, 401);
});

test('unsigned "alg: none" tokens are rejected', async () => {
  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const forged = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ sub: 'admin-1', role: 'ADMIN' }) + '.';
  const res = await call('POST', '/api/payments/3f2b8c1e-6a4d-4e0b-9d57-1c2a3b4c5d6e/refund', { token: forged });
  assert.equal(res.status, 401);
});

test('order-service contract: POST returns the payment itself with id and status', async () => {
  const res = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-contract', amount: 120.5 } });

  assert.equal(res.status, 201);
  assert.equal(typeof res.body.id, 'string');
  assert.equal(res.body.status, 'SUCCESS');
  assert.equal(res.body.amount, 120.5);
  assert.equal(res.body.userId, 'user-1');
  assert.equal('providerRef' in res.body, false);
});

test('replaying a paid order returns 200 and the same payment', async () => {
  const first = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-replay', amount: 9 } });
  const again = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-replay', amount: 9 } });

  assert.equal(again.status, 200);
  assert.equal(again.body.id, first.body.id);
});

test('unknown fields, bad amounts and bad JSON are rejected', async () => {
  const unknown = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-x', amount: 5, status: 'SUCCESS' } });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.error.code, 'VALIDATION_ERROR');

  assert.equal((await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-x', amount: -5 } })).status, 400);

  const broken = await call('POST', '/api/payments', { token: userToken, raw: '{"orderId": ' });
  assert.equal(broken.status, 400);
  assert.equal(broken.body.error.code, 'INVALID_JSON');

  const huge = await call('POST', '/api/payments', { token: userToken, raw: JSON.stringify({ orderId: 'o', amount: 1, pad: 'x'.repeat(20000) }) });
  assert.equal(huge.status, 413);
});

test('users read only their own payments', async () => {
  const mine = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-mine', amount: 3 } });
  const otherToken = tokenFor({ sub: 'user-2', role: 'USER' });

  assert.equal((await call('GET', '/api/payments/' + mine.body.id, { token: userToken })).status, 200);
  assert.equal((await call('GET', '/api/payments/' + mine.body.id, { token: otherToken })).status, 404);
  assert.equal((await call('GET', '/api/payments/' + mine.body.id, { token: adminToken })).status, 200);
  assert.equal((await call('GET', '/api/payments/not-a-uuid', { token: userToken })).status, 404);

  const list = await call('GET', '/api/payments?orderId=o-mine', { token: userToken });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
});

test('duplicated query parameters are rejected', async () => {
  const res = await call('GET', '/api/payments?orderId=a&orderId=b', { token: userToken });
  assert.equal(res.status, 400);
});

test('only admins can refund', async () => {
  const paid = await call('POST', '/api/payments', { token: userToken, body: { orderId: 'o-refund', amount: 40 } });
  const url = '/api/payments/' + paid.body.id + '/refund';

  assert.equal((await call('POST', url)).status, 401);
  assert.equal((await call('POST', url, { token: userToken })).status, 403);

  const refunded = await call('POST', url, { token: adminToken });
  assert.equal(refunded.status, 200);
  assert.equal(refunded.body.status, 'REFUNDED');
});

test('unknown routes return the standard error body', async () => {
  const res = await call('GET', '/api/nope', { token: userToken });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'ROUTE_NOT_FOUND');
});
