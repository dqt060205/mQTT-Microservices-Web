const { Router } = require('express');
const { requireAdmin } = require('../middlewares/auth');
const { createProductController } = require('../controllers/product.controller');

function createProductRouter(productService) {
  const router = Router();
  const ctrl = createProductController(productService);

  router.get('/', ctrl.list);
  router.get('/:id', ctrl.getOne);
  router.post('/', requireAdmin, ctrl.create);
  router.patch('/:id', requireAdmin, ctrl.update);
  router.delete('/:id', requireAdmin, ctrl.delete);

  return router;
}

module.exports = { createProductRouter };
