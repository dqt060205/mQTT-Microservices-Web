const env = require('../config/env');
const { request } = require('../lib/http');

// Expected: GET /api/cart -> { items: [{ id, productId, quantity }] }
const getCart = (token) => request(env.cartServiceUrl, '/api/cart', { token });

// Expected: DELETE /api/cart
const clearCart = (token) =>
  request(env.cartServiceUrl, '/api/cart', { method: 'DELETE', token });

module.exports = { getCart, clearCart };
