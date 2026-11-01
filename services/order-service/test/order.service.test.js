const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createOrderService } = require('../src/services/order.service');
const { createFakePrisma } = require('./helpers');

const shipping = {
  shippingName: 'Nguyen Van A',
  shippingPhone: '0901234567',
  shippingAddress: '1 Dai Co Viet, Hanoi',
};

const PRODUCTS = {
  p1: { id: 'p1', name: 'ESP32 DevKit', price: 189000, stock: 10 },
  p2: { id: 'p2', name: 'DHT22', price: 79000.5, stock: 1 },
};

function setup({ cartItems, pay } = {}) {
  const prisma = createFakePrisma();
  const state = { cartCleared: 0 };
  const service = createOrderService({
    prisma,
    cartClient: {
      getCart: async () => ({ items: cartItems ?? [] }),
      clearCart: async () => { state.cartCleared += 1; },
    },
    productClient: {
      getProduct: async (id) => {
        if (!PRODUCTS[id]) throw Object.assign(new Error('not found'), { upstreamStatus: 404 });
        return PRODUCTS[id];
      },
    },
    paymentClient: { pay: pay ?? (async () => ({ id: 'pay-1', status: 'SUCCESS' })) },
    logger: { error() {} },
  });
  return { service, prisma, state };
}

const create = (service) => service.createOrder({ userId: 'u1', token: 't', shipping });

test('creates a PAID order with price snapshot and clears the cart', async () => {
  const { service, state } = setup({
    cartItems: [{ productId: 'p1', quantity: 2 }, { productId: 'p2', quantity: 1 }],
  });
  const order = await create(service);
  assert.equal(order.status, 'PAID');
  assert.equal(order.paymentId, 'pay-1');
  assert.equal(order.totalAmount, '457000.50'); // 2 * 189000 + 79000.5
  assert.equal(order.items.length, 2);
  assert.equal(order.items[0].unitPrice, '189000.00');
  assert.equal(state.cartCleared, 1);
});

test('rejects an empty cart', async () => {
  const { service } = setup({ cartItems: [] });
  await assert.rejects(create(service), { status: 400 });
});

test('rejects when stock is insufficient', async () => {
  const { service, prisma } = setup({ cartItems: [{ productId: 'p2', quantity: 5 }] });
  await assert.rejects(create(service), { status: 409 });
  assert.equal(prisma.orders.length, 0);
});

test('rejects unknown products', async () => {
  const { service } = setup({ cartItems: [{ productId: 'nope', quantity: 1 }] });
  await assert.rejects(create(service), { status: 400 });
});

test('keeps the order as PAYMENT_FAILED when payment is declined', async () => {
  const { service, state } = setup({
    cartItems: [{ productId: 'p1', quantity: 1 }],
    pay: async () => ({ id: 'pay-2', status: 'FAILED' }),
  });
  const order = await create(service);
  assert.equal(order.status, 'PAYMENT_FAILED');
  assert.equal(state.cartCleared, 0);
});

test('keeps the order as PAYMENT_FAILED when payment-service is down', async () => {
  const { service } = setup({
    cartItems: [{ productId: 'p1', quantity: 1 }],
    pay: async () => { throw new Error('ECONNREFUSED'); },
  });
  assert.equal((await create(service)).status, 'PAYMENT_FAILED');
});

test('cancels an eligible order', async () => {
  const { service } = setup({ cartItems: [{ productId: 'p1', quantity: 1 }] });
  const { id } = await create(service);
  const cancelled = await service.cancelOrder({ id, userId: 'u1', role: 'user' });
  assert.equal(cancelled.status, 'CANCELLED');
});

test('refuses to cancel a shipped order', async () => {
  const { service, prisma } = setup({ cartItems: [{ productId: 'p1', quantity: 1 }] });
  const { id } = await create(service);
  prisma.orders[0].status = 'SHIPPED';
  await assert.rejects(service.cancelOrder({ id, userId: 'u1', role: 'user' }), { status: 409 });
});

test("hides other users' orders", async () => {
  const { service } = setup({ cartItems: [{ productId: 'p1', quantity: 1 }] });
  const { id } = await create(service);
  await assert.rejects(service.getOrder({ id, userId: 'u2', role: 'user' }), { status: 404 });
  assert.ok(await service.getOrder({ id, userId: 'u2', role: 'admin' }));
});
