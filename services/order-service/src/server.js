const env = require('./config/env');

if (!env.jwtSecret) {
  console.error('JWT_SECRET is required (see .env.example)');
  process.exit(1);
}

const prisma = require('./lib/prisma');
const cartClient = require('./clients/cart.client');
const productClient = require('./clients/product.client');
const paymentClient = require('./clients/payment.client');
const { createOrderService } = require('./services/order.service');
const { createApp } = require('./app');

const orderService = createOrderService({ prisma, cartClient, productClient, paymentClient });
const app = createApp({ orderService });

const server = app.listen(env.port, () => {
  console.log(`order-service listening on :${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
