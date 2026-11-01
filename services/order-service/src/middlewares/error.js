const { ZodError } = require('zod');
const { AppError } = require('../lib/errors');

function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500 && !(err instanceof AppError)) console.error(err);

  const expose = status < 500 || err instanceof AppError;
  res.status(status).json({ message: expose ? err.message : 'Internal server error' });
}

module.exports = { notFound, errorHandler };
