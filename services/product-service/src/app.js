import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import prisma from './config/prisma.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import { requestContext } from './middleware/request-context.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import { asyncHandler } from './utils/async-handler.js';
import { ApiError } from './utils/api-error.js';

function buildCorsOptions() {
  const configuredOrigins = process.env.CORS_ORIGIN?.trim();

  if (!configuredOrigins || configuredOrigins === '*') {
    return {
      origin: '*'
    };
  }

  const allowedOrigins = configuredOrigins
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

      callback(
        new ApiError(403, 'CORS_ORIGIN_DENIED', 'The request origin is not allowed.')
      );
    }
  };
}

const app = express();

app.disable('x-powered-by');
app.use(requestContext);
app.use(helmet());
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'product-service',
      version: '1.0.0'
    }
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'product-service'
  });
});

app.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.status(200).json({
      status: 'ready',
      service: 'product-service'
    });
  })
);

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
