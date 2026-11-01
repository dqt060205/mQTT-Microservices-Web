const env = require('../config/env');
const { request } = require('../lib/http');

// Expected: GET /api/products/:id -> { id, name, price, stock, imageUrl? }
const getProduct = (id, token) =>
  request(env.productServiceUrl, `/api/products/${encodeURIComponent(id)}`, { token });

module.exports = { getProduct };
