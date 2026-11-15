export function notFoundHandler(req, res) {
  const message = `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    message,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message,
      path: req.originalUrl,
      method: req.method,
    },
  });
}

export function errorHandler(err, req, res, _next) {
  console.error('[API Gateway Error]:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Đã xảy ra lỗi nội bộ tại API Gateway.';
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: err.code || 'INTERNAL_GATEWAY_ERROR',
      message,
    },
  });
}
