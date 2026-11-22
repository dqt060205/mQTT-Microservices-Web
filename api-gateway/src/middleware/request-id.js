import { randomUUID } from 'node:crypto';

/**
 * Middleware tạo hoặc chuyển tiếp X-Request-Id xuyên suốt hệ thống microservices.
 * Giúp theo dõi vết request (traceability) trên log của Gateway và các downstream services.
 */
export function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId =
    incomingId && typeof incomingId === 'string' && incomingId.trim()
      ? incomingId.trim()
      : randomUUID();

  req.id = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
