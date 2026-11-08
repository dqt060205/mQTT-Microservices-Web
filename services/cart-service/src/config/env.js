require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 5000,
};
