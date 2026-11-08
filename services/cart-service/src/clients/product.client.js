const env = require('../config/env');
const { AppError } = require('../lib/errors');

async function getProduct(productId, token) {
  let response;
  try {
    response = await fetch(`${env.productServiceUrl}/api/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(env.requestTimeoutMs),
    });
  } catch {
    throw new AppError(502, 'Product service is unavailable');
  }

  if (response.status === 404) throw new AppError(404, 'Product not found');
  if (!response.ok) throw new AppError(502, 'Product service returned an error');

  const product = await response.json();
  if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
    throw new AppError(502, 'Product service returned an invalid price');
  }
  return product;
}

module.exports = { getProduct };
