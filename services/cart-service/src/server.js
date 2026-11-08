const env = require('./config/env');

if (!env.jwtSecret) {
  console.error('JWT_SECRET is required (see .env.example)');
  process.exit(1);
}

const prisma = require('./lib/prisma');
const productClient = require('./clients/product.client');
const { createCartService } = require('./services/cart.service');
const { createApp } = require('./app');

const cartService = createCartService({ prisma, productClient });
const app = createApp({ cartService });
const server = app.listen(env.port, () => {
  console.log(`cart-service listening on :${env.port}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
