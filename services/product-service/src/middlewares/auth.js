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
    const userId = payload.sub ?? payload.id;
    const role = String(payload.role || '').toLowerCase();
    const roles = Array.isArray(payload.roles)
      ? payload.roles.map((r) => String(r).toLowerCase())
      : [];

    req.user = {
      id: userId ? String(userId) : null,
      role: role || 'user',
      roles,
      isAdmin: role === 'admin' || roles.includes('admin'),
    };
    req.token = token;
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
