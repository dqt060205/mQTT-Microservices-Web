import cors from 'cors';
import { config } from '../config/env.js';

export function buildCorsMiddleware() {
  const originSetting = config.corsOrigin.trim();

  const standardAllowedHeaders = [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Idempotency-Key',
    'X-Request-Id',
  ];

  if (!originSetting || originSetting === '*') {
    return cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: standardAllowedHeaders,
    });
  }

  const allowedOrigins = originSetting
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: standardAllowedHeaders,
  });
}
