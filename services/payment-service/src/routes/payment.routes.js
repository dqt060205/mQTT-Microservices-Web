import { Router } from 'express';

export function createPaymentRouter({ controller, auth }) {
  const router = Router();

  router.post('/', auth.authenticate, controller.create);
  router.get('/', auth.authenticate, controller.list);
  router.get('/:id', auth.authenticate, controller.get);
  router.post('/:id/refund', auth.requireAdmin, controller.refund);

  return router;
}
