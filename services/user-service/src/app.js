import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/user.routes.js';
import prisma from './config/prisma.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: 'user-service',
      version: '1.0.0'
    }
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'user-service'
  });
});

app.get('/ready', async (_req, res) => {
  await prisma.$queryRawUnsafe('SELECT 1');
  res.status(200).json({
    status: 'ready',
    service: 'user-service'
  });
});

app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong'
    }
  });
});

export default app;