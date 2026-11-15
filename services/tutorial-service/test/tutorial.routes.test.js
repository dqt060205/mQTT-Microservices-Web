const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const env = require('../src/config/env');
const tutorial = {
  id: 'a7f398af-bb96-4fa2-bb29-d76973e86f69',
  title: 'ESP32 Basics',
  slug: 'esp32-basics',
  content: 'A practical guide to getting started with an ESP32 board.',
  isPublished: true,
};

function buildApp() {
  const tutorialService = {
    listTutorials: async () => ({ items: [tutorial], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    listTutorialsByProduct: async () => ({ items: [tutorial], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    getTutorialById: async () => tutorial,
    getTutorialBySlug: async () => tutorial,
    createTutorial: async (input) => ({ id: tutorial.id, ...input }),
    updateTutorial: async (id, input) => ({ ...tutorial, id, ...input }),
    deleteTutorial: async () => undefined,
  };
  return createApp({ tutorialService, prisma: { $queryRawUnsafe: async () => [{ '?column?': 1 }] } });
}

const adminToken = () => jwt.sign({ sub: 'admin-1', role: 'admin' }, env.jwtSecret);

test('health check is public', async () => {
  const response = await request(buildApp()).get('/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.service, 'tutorial-service');
});

test('lists published tutorials with pagination', async () => {
  const response = await request(buildApp()).get('/api/tutorials');
  assert.equal(response.status, 200);
  assert.equal(response.body.data[0].slug, 'esp32-basics');
  assert.equal(response.body.pagination.total, 1);
});

test('rejects tutorial writes without an admin token', async () => {
  const response = await request(buildApp()).post('/api/tutorials').send({});
  assert.equal(response.status, 401);
});

test('creates a tutorial for an admin', async () => {
  const response = await request(buildApp())
    .post('/api/tutorials')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ title: 'ESP32 Basics', content: 'A complete tutorial for setting up an ESP32 board.' });
  assert.equal(response.status, 201);
  assert.equal(response.body.slug, 'esp32-basics');
});

test('validates tutorial input', async () => {
  const response = await request(buildApp())
    .post('/api/tutorials')
    .set('Authorization', `Bearer ${adminToken()}`)
    .send({ title: '', content: '' });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed');
});
