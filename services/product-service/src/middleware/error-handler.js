import { ApiError } from '../utils/api-error.js';

function mapDatabaseError(error) {
  if (error?.code === 'P2002') {
    const fields = Array.isArray(error.meta?.target)
      ? error.meta.target
      : [error.meta?.target].filter(Boolean);

    return new ApiError(
      409,
      'RESOURCE_CONFLICT',
      'A resource with the same unique value already exists.',
      fields.length > 0 ? { fields } : undefined
    );
  }

  if (error?.code === 'P2003') {
    return new ApiError(
      409,
      'REFERENCE_CONFLICT',
      'The resource is still referenced by another record.'
    );
  }

  if (error?.code === 'P2025') {
    return new ApiError(404, 'RESOURCE_NOT_FOUND', 'The resource was not found.');
  }

  return error;
}

export function errorHandler(error, req, res, _next) {
  let handledError = mapDatabaseError(error);

  if (
    handledError instanceof SyntaxError &&
    handledError.status === 400 &&
    'body' in handledError
  ) {
    handledError = new ApiError(
      400,
      'INVALID_JSON',
      'The request body contains invalid JSON.'
    );
  }

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

  const response = {
    success: false,
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
