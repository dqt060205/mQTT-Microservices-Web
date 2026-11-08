const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const prisma = require('./lib/prisma');
const { createProductRouter } = require('./routes/product.routes');
const { createCategoryRouter } = require('./routes/category.routes');
const { notFound, errorHandler } = require('./middlewares/error');

function createApp({ productService, categoryService }) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));
  app.get('/ready', async (req, res, next) => {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      res.json({ status: 'ready', service: 'product-service' });
    } catch (err) {
      next(err);
    }
  });

  app.use('/api/products', createProductRouter(productService));
  app.use('/api/categories', createCategoryRouter(categoryService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
