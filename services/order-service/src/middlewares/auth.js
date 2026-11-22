const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../lib/errors');

function normalizeRole(role) {
  if (Array.isArray(role)) {
    return role.map((value) => String(value).toUpperCase()).includes('ADMIN') ? 'ADMIN' : 'USER';
  }
  return String(role || 'USER').toUpperCase();
}

function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Missing or invalid Authorization header'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: String(payload.sub ?? payload.id),
      role: normalizeRole(payload.role ?? payload.roles),
    };
    req.token = token;
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'Admin role required'));
  }
  return next();
}

module.exports = { authenticate, requireAdmin, normalizeRole };
