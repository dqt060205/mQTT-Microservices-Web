export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
      path: req.originalUrl,
      method: req.method,
    },
  });
}

export function errorHandler(err, req, res, _next) {
  console.error('[API Gateway Error]:', err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_GATEWAY_ERROR',
      message: err.message || 'Đã xảy ra lỗi nội bộ tại API Gateway.',
    },
  });
}

