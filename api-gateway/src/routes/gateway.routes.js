import express from 'express';
import { config } from '../config/env.js';

const router = express.Router();
const startTime = Date.now();

// Thông tin chung về API Gateway và danh sách các microservice đã cấu hình
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'mQTT API Gateway',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      environment: config.nodeEnv,
      services: Object.values(config.services).map((srv) => ({
        id: srv.id,
        name: srv.name,
        targetUrl: srv.url,
        routes: srv.routes,
        description: srv.description,
      })),
    },
  });
});

// Liveness probe kiểm tra sức khỏe của API Gateway
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  });
});

// Readiness probe
router.get('/ready', (_req, res) => {
  res.status(200).json({
    status: 'ready',
    service: 'api-gateway',
  });
});

// Kiểm tra sức khỏe tổng hợp của tất cả các microservice backend
router.get('/services/health', async (_req, res) => {
  const serviceEntries = Object.entries(config.services);

  const checks = await Promise.all(
    serviceEntries.map(async ([_key, srv]) => {
      const start = Date.now();
      try {
        const response = await fetch(`${srv.url}/health`, {
          signal: AbortSignal.timeout(2000),
        });
        const latencyMs = Date.now() - start;
        return {
          id: srv.id,
          name: srv.name,
          url: srv.url,
          status: response.ok ? 'UP' : 'DEGRADED',
          statusCode: response.status,
          latencyMs,
        };
      } catch (err) {
        return {
          id: srv.id,
          name: srv.name,
          url: srv.url,
          status: 'DOWN',
          error: err.name === 'TimeoutError' ? 'Request timed out (2s)' : err.message,
        };
      }
    })
  );

  const allUp = checks.every((c) => c.status === 'UP');

  res.status(allUp ? 200 : 207).json({
    gateway: 'ok',
    timestamp: new Date().toISOString(),
    services: checks,
  });
});

export default router;

