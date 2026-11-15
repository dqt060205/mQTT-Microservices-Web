import 'dotenv/config';
import { buildApp } from './app.js';
import prisma from './config/prisma.js';
import { loadPaymentConfig } from './config/payment.config.js';

function getPort() {
  const value = process.env.PORT ?? '3005';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set (use the same value as user-service).');
}

const port = getPort();
const app = buildApp({ prisma, jwtSecret, config: loadPaymentConfig() });

const server = app.listen(port, () => {
  console.log('Payment service running on port ' + port);
  console.log('DEMO payment provider is active: no real money is moved.');
});

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(signal + ' received. Shutting down payment service.');

  const forceExitTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  server.close(async (serverError) => {
    try {
      await prisma.$disconnect();
    } catch (databaseError) {
      console.error('Failed to disconnect Prisma.', databaseError);
      exitCode = 1;
    }

    if (serverError) {
      console.error('HTTP server shutdown failed.', serverError);
      exitCode = 1;
    }

    clearTimeout(forceExitTimer);
    process.exit(exitCode);
  });
}

server.on('error', (error) => {
  console.error('Payment service failed to start.', error);
  shutdown('SERVER_ERROR', 1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection.', error);
  shutdown('UNHANDLED_REJECTION', 1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception.', error);
  shutdown('UNCAUGHT_EXCEPTION', 1);
});
