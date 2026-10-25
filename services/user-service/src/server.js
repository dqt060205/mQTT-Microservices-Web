import 'dotenv/config';
import app from './app.js';
import prisma from './config/prisma.js';

function getPort() {
  const value = process.env.PORT ?? '3001';
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

const port = getPort();
const server = app.listen(port, () => {
  console.log('User service running on port ' + port);
});

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(signal + ' received. Shutting down user service.');

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
  console.error('User service failed to start.', error);
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
  shutdown('UNHANDLED_REJECTION', 1);
});