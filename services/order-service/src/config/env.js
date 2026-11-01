require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3004,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  cartServiceUrl: process.env.CART_SERVICE_URL || 'http://localhost:3003',
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 5000,
};
