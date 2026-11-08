const { ZodError } = require('zod');
const { AppError } = require('../lib/errors');

function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  if (err?.code === 'P2002') {
    return res.status(409).json({ message: 'A record with this unique value already exists' });
  }
  if (err?.code === 'P2025') {
    return res.status(404).json({ message: 'Record not found' });
  }
  if (err?.code === 'P2003') {
    return res.status(409).json({ message: 'Cannot delete or update because record is referenced by other data' });
  }

  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500 && !(err instanceof AppError)) console.error(err);

  const expose = status < 500 || err instanceof AppError;
  res.status(status).json({ message: expose ? err.message : 'Internal server error' });
}

module.exports = { notFound, errorHandler };

