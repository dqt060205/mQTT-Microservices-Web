import { ApiError } from '../utils/api-error.js';

function mapKnownError(error) {
  if (error?.code === 'P2002') {
    return new ApiError(
      409,
      'RESOURCE_CONFLICT',
      'A resource with the same unique value already exists.'
    );
  }

  if (error?.code === 'P2025') {
    return new ApiError(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.');
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }

  if (
    error?.type === 'entity.parse.failed' ||
    (error instanceof SyntaxError && error.status === 400 && 'body' in error)
  ) {
    return new ApiError(400, 'INVALID_JSON', 'The request body contains invalid JSON.');
  }

  return error;
}

export function errorHandler(error, req, res, _next) {
  const handledError = mapKnownError(error);
  const isOperational = handledError instanceof ApiError;
  const statusCode = isOperational ? handledError.statusCode : 500;
  const code = isOperational ? handledError.code : 'INTERNAL_SERVER_ERROR';
  const message = isOperational
    ? handledError.message
    : 'An unexpected error occurred.';

  if (statusCode >= 500) {
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      error: handledError
    });
  }

  // Same envelope as product-service, plus a top-level `message`
  // because order-service's http client reads `data.message` from upstream errors.
  const response = {
    success: false,
    message,
    error: {
      code,
      message,
      requestId: req.id
    }
  };

  if (isOperational && handledError.details !== undefined) {
    response.error.details = handledError.details;
  }

  if (process.env.NODE_ENV === 'development' && !isOperational) {
    response.error.stack = handledError.stack;
  }

  res.status(statusCode).json(response);
}
