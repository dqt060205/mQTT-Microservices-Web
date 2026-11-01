const env = require('../config/env');
const { request } = require('../lib/http');

// Expected: POST /api/payments { orderId, amount } -> { id, status: "SUCCESS" | "FAILED" }
const pay = ({ orderId, amount }, token) =>
  request(env.paymentServiceUrl, '/api/payments', {
    method: 'POST',
    token,
    body: { orderId, amount },
  });

module.exports = { pay };
