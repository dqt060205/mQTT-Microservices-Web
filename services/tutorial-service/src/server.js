const env = require('./config/env');

if (!env.jwtSecret) {
  console.error('JWT_SECRET is required (see .env.example)');
  process.exit(1);
}

const prisma = require('./lib/prisma');
const { createTutorialService } = require('./services/tutorial.service');
const { createApp } = require('./app');
const tutorialService = createTutorialService({ prisma });
const app = createApp({ tutorialService, prisma });

const server = app.listen(env.port, () => {
  console.log(`tutorial-service listening on :${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
