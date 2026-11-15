const { ZodError } = require('zod');
const { AppError } = require('../lib/errors');

function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'A tutorial with this slug already exists' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'Tutorial was not found' });
  }

  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500 && !(err instanceof AppError)) console.error(err);
  res.status(status).json({
    message: status < 500 || err instanceof AppError ? err.message : 'Internal server error',
  });
}

module.exports = { notFound, errorHandler };
