import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import {
  validateCreatePayment,
  validateIdempotencyKey,
  validateListQuery,
  validatePaymentId
} from '../validation/payment.validation.js';

export function createPaymentController({ paymentService }) {
  return {
    // Contract with order-service: POST { orderId, amount } -> { id, status: 'SUCCESS' | 'FAILED', ... }
    // The body is the payment itself (no { success, data } wrapper).
    create: asyncHandler(async (req, res) => {
      if (!req.user.id) {
        throw new ApiError(401, 'INVALID_ACCESS_TOKEN', 'The access token has no user id.');
      }

      const input = validateCreatePayment(req.body);
      const idempotencyKey = validateIdempotencyKey(req.get('idempotency-key'));

      const { payment, created } = await paymentService.createPayment({
        userId: req.user.id,
        ...input,
        idempotencyKey
      });

      res.status(created ? 201 : 200).json(payment);
    }),

    list: asyncHandler(async (req, res) => {
      const query = validateListQuery(req.query);
      const result = await paymentService.listPayments({ user: req.user, ...query });
      res.status(200).json(result);
    }),

    get: asyncHandler(async (req, res) => {
      const id = validatePaymentId(req.params.id);
      const payment = await paymentService.getPayment({ id, user: req.user });
      res.status(200).json(payment);
    }),

    refund: asyncHandler(async (req, res) => {
      const id = validatePaymentId(req.params.id);
      const payment = await paymentService.refundPayment({ id });
      res.status(200).json(payment);
    })
  };
}
