process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const token = jwt.sign({ sub: 'u1', role: 'user' }, 'test-secret');
const auth = { Authorization: `Bearer ${token}` };

function buildApp() {
  const calls = {};
  const orderService = {
    createOrder: async (args) => {
      calls.create = args;
      return { id: 'o1', status: 'PAID', totalAmount: '100.00', items: [{ id: 'i1', unitPrice: '100.00', quantity: 1 }] };
    },
    listOrders: async (args) => {
      calls.list = args;
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },
    getOrder: async () => ({ id: 'o1', status: 'PAID', totalAmount: '100.00', items: [] }),
    cancelOrder: async () => ({ id: 'o1', status: 'CANCELLED', totalAmount: '100.00', items: [] }),
  };
  return { app: createApp({ orderService }), calls };
}

test('GET /health is public', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
});

test('rejects requests without a valid JWT', async () => {
  const { app } = buildApp();
  assert.equal((await request(app).get('/api/orders')).status, 401);
  const bad = await request(app).get('/api/orders').set('Authorization', 'Bearer nope');
  assert.equal(bad.status, 401);
});

test('POST /api/orders validates the body', async () => {
  const { app } = buildApp();
  const res = await request(app).post('/api/orders').set(auth).send({ shippingName: '' });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation failed');
});

test('POST /api/orders creates an order for the authenticated user', async () => {
  const { app, calls } = buildApp();
  const res = await request(app).post('/api/orders').set(auth).send({
    shippingName: 'Nguyen Van A',
    shippingPhone: '0901234567',
    shippingAddress: '1 Dai Co Viet, Hanoi',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.totalAmount, 100); // Decimal string -> number
  assert.equal(calls.create.userId, 'u1');
  assert.equal(calls.create.token, token);
});

test('GET /api/orders applies pagination defaults', async () => {
  const { app, calls } = buildApp();
  const res = await request(app).get('/api/orders?status=PAID').set(auth);
  assert.equal(res.status, 200);
  assert.deepEqual(calls.list, { userId: 'u1', page: 1, limit: 10, status: 'PAID' });
});

test('PATCH /api/orders/:id/cancel returns the cancelled order', async () => {
  const { app } = buildApp();
  const res = await request(app).patch('/api/orders/o1/cancel').set(auth);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'CANCELLED');
});
