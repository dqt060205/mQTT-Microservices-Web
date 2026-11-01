const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { createOrderRouter } = require('./routes/order.routes');
const { notFound, errorHandler } = require('./middlewares/error');

function createApp({ orderService }) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));
  app.use('/api/orders', createOrderRouter(orderService));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
