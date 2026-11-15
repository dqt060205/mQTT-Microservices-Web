const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../lib/errors');

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const role = String(payload.role || '').toLowerCase();
    const roles = Array.isArray(payload.roles)
      ? payload.roles.map((value) => String(value).toLowerCase())
      : [];
    req.user = {
      id: payload.sub ?? payload.id ?? null,
      isAdmin: role === 'admin' || roles.includes('admin'),
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    if (!req.user?.isAdmin) {
      return next(new AppError(403, 'Administrator permission is required'));
    }
    next();
  });
}

module.exports = { authenticate, requireAdmin };
