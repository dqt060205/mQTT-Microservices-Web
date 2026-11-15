import { randomUUID } from 'node:crypto';

export function requestContext(req, res, next) {
  const suppliedRequestId = req.get('x-request-id');
  const requestId =
    suppliedRequestId && suppliedRequestId.length <= 100
      ? suppliedRequestId
      : randomUUID();

  req.id = requestId;
  res.set('x-request-id', requestId);
  next();
}
