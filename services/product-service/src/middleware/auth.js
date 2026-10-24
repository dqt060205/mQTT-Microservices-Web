import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.js';

function readBearerToken(req) {
  const authorization = req.get('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ApiError(
      401,
      'INVALID_AUTHORIZATION',
      'Authorization header must use the Bearer scheme.'
    );
  }

  return token;
}

export function requireAdmin(req, _res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      throw new ApiError(
        401,
        'AUTHENTICATION_REQUIRED',
        'An administrator access token is required.'
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new ApiError(
        500,
        'AUTH_CONFIGURATION_ERROR',
        'JWT verification is not configured.'
      );
    }

    let payload;

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256']
      });
    } catch {
      throw new ApiError(
        401,
        'INVALID_ACCESS_TOKEN',
        'The access token is invalid or expired.'
      );
    }

    const roles = Array.isArray(payload.roles)
      ? payload.roles.map((role) => String(role).toLowerCase())
      : [];
    const role = String(payload.role ?? '').toLowerCase();

    if (role !== 'admin' && !roles.includes('admin')) {
      throw new ApiError(
        403,
        'ADMIN_ROLE_REQUIRED',
        'Administrator permission is required.'
      );
    }

    req.user = {
      id: payload.sub ?? payload.id ?? null,
      role: 'admin'
    };

    next();
  } catch (error) {
    next(error);
  }
}
