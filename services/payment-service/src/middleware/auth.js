import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.js';

function readBearerToken(req) {
  const authorization = req.get('authorization');

  if (!authorization) {
    throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'An access token is required.');
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

/**
 * JWT verification shared with user-service (same JWT_SECRET, HS256 only).
 * Sets req.user = { id, role: 'admin' | 'user' }.
 */
export function createAuth({ jwtSecret }) {
  function authenticate(req, _res, next) {
    try {
      const token = readBearerToken(req);
      let payload;

      try {
        payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
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
      const isAdmin =
        String(payload.role ?? '').toLowerCase() === 'admin' || roles.includes('admin');
      const id = payload.sub ?? payload.id ?? null;

      req.user = {
        id: id === null ? null : String(id),
        role: isAdmin ? 'admin' : 'user'
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  function requireAdmin(req, res, next) {
    authenticate(req, res, (error) => {
      if (error) {
        next(error);
        return;
      }

      if (req.user.role !== 'admin') {
        next(
          new ApiError(403, 'ADMIN_ROLE_REQUIRED', 'Administrator permission is required.')
        );
        return;
      }

      next();
    });
  }

  return { authenticate, requireAdmin };
}
