import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { loadPaymentConfig } from './config/payment.config.js';
import { createDemoProvider } from './providers/demo.provider.js';
import { createPaymentService } from './services/payment.service.js';
import { createPaymentController } from './controllers/payment.controller.js';
import { createPaymentRouter } from './routes/payment.routes.js';
import { createAuth } from './middleware/auth.js';
import { requestContext } from './middleware/request-context.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { asyncHandler } from './utils/async-handler.js';
import { ApiError } from './utils/api-error.js';

function buildCorsOptions(configuredOrigins) {
  const value = configuredOrigins?.trim();

  if (!value || value === '*') {
    return { origin: '*' };
  }

  const allowedOrigins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, 'CORS_ORIGIN_DENIED', 'The request origin is not allowed.'));
    }
  };
}

/**
 * Everything is injected, so tests can run the real HTTP layer with a fake database.
 */
export function buildApp({
  prisma,
  jwtSecret,
  config = loadPaymentConfig(),
  provider,
  logger = console,
  corsOrigin = process.env.CORS_ORIGIN
}) {
  const paymentProvider =
    provider ??
    createDemoProvider({
      delayMs: config.demoDelayMs,
      failRate: config.demoFailRate,
      maxAmount: config.demoMaxAmount
    });

  const paymentService = createPaymentService({ prisma, provider: paymentProvider, logger });
  const controller = createPaymentController({ paymentService });
  const auth = createAuth({ jwtSecret });

  const app = express();

  app.disable('x-powered-by');
  app.use(requestContext);
  app.use(helmet());
  app.use(cors(buildCorsOptions(corsOrigin)));
  // Payment bodies are tiny: a small limit makes oversized-body abuse cheap to reject
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: { service: 'payment-service', version: '1.0.0', provider: paymentProvider.name }
    });
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: 'payment-service' });
  });

  app.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready', service: 'payment-service' });
    })
  );

  app.use('/api/payments', createPaymentRouter({ controller, auth }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
