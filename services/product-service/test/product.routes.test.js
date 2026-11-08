process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const adminToken = jwt.sign({ sub: 'admin-1', role: 'admin' }, 'test-secret');
const userToken = jwt.sign({ sub: 'user-1', role: 'user' }, 'test-secret');

const adminAuth = { Authorization: `Bearer ${adminToken}` };
const userAuth = { Authorization: `Bearer ${userToken}` };

function buildApp() {
  const calls = {};
  const mockProduct = {
    id: 'p1',
    name: 'ESP32 Development Board',
    slug: 'esp32-development-board',
    sku: 'MQTT-ESP32-001',
    description: 'Wi-Fi dev board',
    price: '12.90',
    stock: 50,
    imageUrl: 'https://images.example.com/esp32.jpg',
    categoryId: null,
  };

  const productService = {
    listProducts: async (filters) => {
      calls.list = filters;
      return {
        items: [mockProduct],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
    },
    getProductById: async (id) => {
      calls.getOne = id;
      if (id === 'not-found') return null;
      return mockProduct;
    },
    createProduct: async (input) => {
      calls.create = input;
      return { id: 'p2', ...input };
    },
    updateProduct: async (id, input) => {
      calls.update = { id, input };
      return { ...mockProduct, ...input };
    },
    deleteProduct: async (id) => {
      calls.delete = id;
    },
  };

  const categoryService = {
    listCategories: async () => [],
    getCategoryById: async () => null,
    createCategory: async () => {},
    updateCategory: async () => {},
    deleteCategory: async () => {},
  };

  return { app: createApp({ productService, categoryService }), calls, mockProduct };
}

test('GET /health is public', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'product-service');
});

test('GET /api/products returns items and pagination', async () => {
  const { app, calls } = buildApp();
  const res = await request(app).get('/api/products?page=1&limit=10&search=esp32');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.equal(res.body.items[0].id, 'p1');
  assert.equal(calls.list.search, 'esp32');
});

test('GET /api/products/:id returns product directly', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/api/products/p1');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'p1');
  assert.equal(res.body.price, '12.90');
  assert.equal(Number(res.body.price), 12.9);
});

test('POST /api/products rejects without valid admin JWT', async () => {
  const { app } = buildApp();
  // No auth
  const resNoAuth = await request(app).post('/api/products').send({ name: 'Test' });
  assert.equal(resNoAuth.status, 401);

  // User auth (non-admin)
  const resUser = await request(app)
    .post('/api/products')
    .set(userAuth)
    .send({ name: 'Test', sku: 'TEST', price: 10 });
  assert.equal(resUser.status, 403);
});

test('POST /api/products validates schema with Zod', async () => {
  const { app } = buildApp();
  const res = await request(app)
    .post('/api/products')
    .set(adminAuth)
    .send({ name: '', sku: '', price: -5 });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Validation failed');
});

test('POST /api/products creates product with admin token and generates slug', async () => {
  const { app, calls } = buildApp();
  const res = await request(app)
    .post('/api/products')
    .set(adminAuth)
    .send({
      name: 'Cảm biến Nhiệt độ DHT22',
      sku: 'mqtt-dht22',
      price: 8.5,
      stock: 20,
    });
  assert.equal(res.status, 201);
  assert.equal(calls.create.sku, 'MQTT-DHT22'); // Uppercased
  assert.equal(calls.create.slug, 'cam-bien-nhiet-do-dht22'); // Vietnamese slugified
});

test('PATCH /api/products/:id updates product for admin', async () => {
  const { app, calls } = buildApp();
  const res = await request(app)
    .patch('/api/products/p1')
    .set(adminAuth)
    .send({ price: 15.0 });
  assert.equal(res.status, 200);
  assert.equal(calls.update.id, 'p1');
  assert.equal(calls.update.input.price, 15);
});

test('DELETE /api/products/:id deletes product for admin', async () => {
  const { app, calls } = buildApp();
  const res = await request(app).delete('/api/products/p1').set(adminAuth);
  assert.equal(res.status, 204);
  assert.equal(calls.delete, 'p1');
});

