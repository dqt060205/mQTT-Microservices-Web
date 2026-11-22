import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { config } from '../src/config/env.js';

describe('API Gateway Full Test Suite', () => {
  let gatewayServer;
  let mockServers = {};
  let gatewayUrl;

  before(async () => {
    // 1. Tạo mock server cho từng microservice
    const serviceIds = ['user', 'product', 'cart', 'order', 'payment', 'tutorial'];

    for (const id of serviceIds) {
      await new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            if (req.url === '/health') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ status: 'ok', service: `${id}-service` }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                status: 'ok',
                service: `${id}-service`,
                receivedUrl: req.url,
                receivedMethod: req.method,
                receivedAuth: req.headers.authorization,
                receivedIdempotency: req.headers['idempotency-key'],
                receivedBody: body ? JSON.parse(body) : null,
              })
            );
          });
        });

        srv.listen(0, () => {
          const port = srv.address().port;
          config.services[id].url = `http://localhost:${port}`;
          mockServers[id] = srv;
          resolve();
        });
      });
    }

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
    for (const srv of Object.values(mockServers)) {
      srv.close();
    }
  });

  test('GET / returns gateway metadata and all 6 configured services', async () => {
    const res = await fetch(`${gatewayUrl}/`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.name, 'mQTT API Gateway');
    assert.equal(data.data.services.length, 6);
    const ids = data.data.services.map((s) => s.id);
    assert.ok(ids.includes('user-service'));
    assert.ok(ids.includes('product-service'));
    assert.ok(ids.includes('cart-service'));
    assert.ok(ids.includes('order-service'));
    assert.ok(ids.includes('payment-service'));
    assert.ok(ids.includes('tutorial-service'));
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

  test('GET /services/health checks all 6 services simultaneously', async () => {
    const res = await fetch(`${gatewayUrl}/services/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.gateway, 'ok');
    assert.equal(data.services.length, 6);
    assert.ok(data.services.every((s) => s.status === 'UP'));
  });

  test('GET /not-exist-route returns 404 with standard message', async () => {
    const res = await fetch(`${gatewayUrl}/not-exist-route`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(data.message.includes('404') || data.message.includes('Không tìm thấy'));
  });

  test('Proxy forwards /api/users to user-service', async () => {
    const res = await fetch(`${gatewayUrl}/api/users/profile`, {
      headers: { Authorization: 'Bearer user-token' },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'user-service');
    assert.equal(data.receivedUrl, '/api/users/profile');
    assert.equal(data.receivedAuth, 'Bearer user-token');
  });

  test('Proxy forwards /api/products and /api/categories to product-service', async () => {
    const res1 = await fetch(`${gatewayUrl}/api/products?search=esp32`);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.service, 'product-service');
    assert.equal(data1.receivedUrl, '/api/products?search=esp32');

    const res2 = await fetch(`${gatewayUrl}/categories`);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.service, 'product-service');
    assert.equal(data2.receivedUrl, '/api/categories');
  });

  test('Proxy forwards /api/cart to cart-service', async () => {
    const res = await fetch(`${gatewayUrl}/api/cart`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'cart-service');
    assert.equal(data.receivedUrl, '/api/cart');
  });

  test('Proxy forwards /api/orders to order-service', async () => {
    const res = await fetch(`${gatewayUrl}/api/orders`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'order-service');
    assert.equal(data.receivedUrl, '/api/orders');
  });

  test('Proxy forwards /api/payments with Idempotency-Key to payment-service', async () => {
    const payload = { orderId: 'ord-123', amount: 50 };
    const res = await fetch(`${gatewayUrl}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'key-abc-123',
      },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'payment-service');
    assert.equal(data.receivedMethod, 'POST');
    assert.equal(data.receivedIdempotency, 'key-abc-123');
    assert.deepEqual(data.receivedBody, payload);
  });

  test('Proxy forwards /api/tutorials to tutorial-service', async () => {
    const res = await fetch(`${gatewayUrl}/api/tutorials/product/esp32`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'tutorial-service');
    assert.equal(data.receivedUrl, '/api/tutorials/product/esp32');
  });

  test('CORS preflight OPTIONS returns allowed headers including Idempotency-Key', async () => {
    const res = await fetch(`${gatewayUrl}/api/payments`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key',
      },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.ok(res.headers.get('access-control-allow-headers').includes('Idempotency-Key'));
  });

  test('Gateway assigns and forwards X-Request-Id', async () => {
    // 1. Without incoming X-Request-Id (Gateway generates UUID)
    const res1 = await fetch(`${gatewayUrl}/health`);
    assert.equal(res1.status, 200);
    assert.ok(res1.headers.get('x-request-id'));

    // 2. With client provided X-Request-Id (Gateway preserves it)
    const clientTraceId = 'trace-client-12345';
    const res2 = await fetch(`${gatewayUrl}/api/users/profile`, {
      headers: { 'X-Request-Id': clientTraceId },
    });
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-request-id'), clientTraceId);
  });

  test('Proxy returns 503 with friendly message when service is unreachable', async () => {
    // Đóng mock server của cart để mô phỏng dịch vụ bị ngắt kết nối
    await new Promise((resolve) => mockServers.cart.close(resolve));

    const res = await fetch(`${gatewayUrl}/api/cart`);
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(data.error.service, 'cart-service');
    assert.ok(data.message.includes('Cart Service'));
  });
});
