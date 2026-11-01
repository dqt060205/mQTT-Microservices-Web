const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { createOrderController } = require('../controllers/order.controller');

function createOrderRouter(orderService) {
  const router = Router();
  const ctrl = createOrderController(orderService);

  router.use(authenticate);
  router.post('/', ctrl.create);
  router.get('/', ctrl.list);
  router.get('/:id', ctrl.getOne);
  router.patch('/:id/cancel', ctrl.cancel);

  return router;
}

module.exports = { createOrderRouter };
