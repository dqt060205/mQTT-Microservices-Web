const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { createCartRouter } = require('./routes/cart.routes');
const { notFound, errorHandler } = require('./middlewares/error');

function createApp({ cartService }) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cart-service' }));
  app.use('/api/cart', createCartRouter(cartService));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
