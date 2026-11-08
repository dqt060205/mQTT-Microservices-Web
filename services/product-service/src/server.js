const env = require('./config/env');

if (!env.jwtSecret) {
  console.error('JWT_SECRET is required (see .env.example)');
  process.exit(1);
}

const prisma = require('./lib/prisma');
const { createProductService } = require('./services/product.service');
const { createCategoryService } = require('./services/category.service');
const { createApp } = require('./app');

const productService = createProductService({ prisma });
const categoryService = createCategoryService({ prisma });
const app = createApp({ productService, categoryService });

const server = app.listen(env.port, () => {
  console.log(`product-service listening on :${env.port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
