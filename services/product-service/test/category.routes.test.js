process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

const adminToken = jwt.sign({ sub: 'admin-1', role: 'admin' }, 'test-secret');
const adminAuth = { Authorization: `Bearer ${adminToken}` };

function buildApp() {
  const calls = {};
  const mockCategory = {
    id: 'c1',
    name: 'Development Boards',
    slug: 'development-boards',
    description: 'Boards for IoT',
    productCount: 5,
  };

  const categoryService = {
    listCategories: async () => [mockCategory],
    getCategoryById: async (id) => (id === 'c1' ? mockCategory : null),
    createCategory: async (input) => {
      calls.create = input;
      return { id: 'c2', ...input };
    },
    updateCategory: async (id, input) => {
      calls.update = { id, input };
      return { ...mockCategory, ...input };
    },
    deleteCategory: async (id) => {
      calls.delete = id;
    },
  };

  const productService = {
    listProducts: async () => ({ items: [], pagination: {} }),
    getProductById: async () => null,
    createProduct: async () => {},
    updateProduct: async () => {},
    deleteProduct: async () => {},
  };

  return { app: createApp({ productService, categoryService }), calls };
}

test('GET /api/categories returns array of categories', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/api/categories');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.equal(res.body[0].name, 'Development Boards');
});

test('GET /api/categories/:id returns category', async () => {
  const { app } = buildApp();
  const res = await request(app).get('/api/categories/c1');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'c1');
});

test('POST /api/categories creates category with admin and auto-slugifies', async () => {
  const { app, calls } = buildApp();
  const res = await request(app)
    .post('/api/categories')
    .set(adminAuth)
    .send({ name: 'Cảm biến Môi trường' });
  assert.equal(res.status, 201);
  assert.equal(calls.create.slug, 'cam-bien-moi-truong');
});

test('DELETE /api/categories/:id deletes category', async () => {
  const { app, calls } = buildApp();
  const res = await request(app).delete('/api/categories/c1').set(adminAuth);
  assert.equal(res.status, 204);
  assert.equal(calls.delete, 'c1');
});

