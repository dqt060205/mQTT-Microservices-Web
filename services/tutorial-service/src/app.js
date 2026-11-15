const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { createTutorialRouter } = require('./routes/tutorial.routes');
const { notFound, errorHandler } = require('./middlewares/error');

function createApp({ tutorialService, prisma }) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  if (env.nodeEnv !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'tutorial-service' }));
  app.get('/ready', async (req, res, next) => {
    try {
      if (!prisma) throw new Error('Database client is unavailable');
      await prisma.$queryRawUnsafe('SELECT 1');
      res.json({ status: 'ready', service: 'tutorial-service' });
    } catch (err) {
      next(err);
    }
  });
  app.use('/api/tutorials', createTutorialRouter(tutorialService));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
