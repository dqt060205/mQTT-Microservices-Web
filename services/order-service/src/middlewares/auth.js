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
    req.user = { id: String(payload.sub ?? payload.id), role: payload.role || 'user' };
    req.token = token; // forwarded to cart/product/payment services
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
  }
}

module.exports = { authenticate };
