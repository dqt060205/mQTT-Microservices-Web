function notFound(req, res, next) {
  next(Object.assign(new Error(`Route not found: ${req.method} ${req.path}`), { status: 404 }));
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
}

module.exports = { notFound, errorHandler };
