import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';

describe('API Gateway Tests', () => {
  let gatewayServer;
  let mockUserServer;
  let gatewayUrl;
  let mockUserPort;

  before(async () => {
    // 1. Khởi tạo Mock User Service để kiểm tra proxy
    await new Promise((resolve) => {
      mockUserServer = http.createServer((req, res) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              status: 'ok',
              service: 'mock-user-service',
              receivedUrl: req.url,
              receivedMethod: req.method,
              receivedAuth: req.headers.authorization,
              receivedBody: body ? JSON.parse(body) : null,
            })
          );
        });
      });
      mockUserServer.listen(0, () => {
        mockUserPort = mockUserServer.address().port;
        // Gán URL cho user service trong config
        config.services.user.url = `http://localhost:${mockUserPort}`;
        resolve();
      });
    });

    // 2. Khởi tạo Gateway
    const app = createApp();
    await new Promise((resolve) => {
      gatewayServer = app.listen(0, () => {
        const port = gatewayServer.address().port;
        gatewayUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (gatewayServer) gatewayServer.close();
    if (mockUserServer) mockUserServer.close();
  });

  test('GET / returns gateway metadata and services list', async () => {
    const res = await fetch(`${gatewayUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.name, 'mQTT API Gateway');
    assert.ok(Array.isArray(data.data.services));
    assert.ok(data.data.services.some((s) => s.id === 'user-service'));
  });

  test('GET /health returns 200 ok', async () => {
    const res = await fetch(`${gatewayUrl}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'api-gateway');
  });

  test('GET /ready returns 200 ready', async () => {
    const res = await fetch(`${gatewayUrl}/ready`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ready');
  });

  test('GET /not-exist-route returns 404 ROUTE_NOT_FOUND', async () => {
    const res = await fetch(`${gatewayUrl}/not-exist-route`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'ROUTE_NOT_FOUND');
  });

  test('Proxy forwards GET /api/users to mock service', async () => {
    const res = await fetch(`${gatewayUrl}/api/users/profile`, {
      headers: {
        Authorization: 'Bearer test-token-123',
      },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.receivedUrl, '/api/users/profile');
    assert.equal(data.receivedMethod, 'GET');
    assert.equal(data.receivedAuth, 'Bearer test-token-123');
  });

  test('Proxy rewrites GET /users to /api/users', async () => {
    const res = await fetch(`${gatewayUrl}/users/me`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.receivedUrl, '/api/users/me');
  });

  test('Proxy streams POST body intact to downstream service', async () => {
    const payload = { email: 'test@mqtt.local', password: 'secretpassword' };
    const res = await fetch(`${gatewayUrl}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.receivedMethod, 'POST');
    assert.deepEqual(data.receivedBody, payload);
  });

  test('Proxy returns 503 SERVICE_UNAVAILABLE when service is unreachable', async () => {
    // Port 19876 is unlikely to be running
    config.services.cart.url = 'http://localhost:19876';

    const res = await fetch(`${gatewayUrl}/api/cart`);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(data.error.service, 'cart-service');
  });
});

