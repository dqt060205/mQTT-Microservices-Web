const { Router } = require('express');
const { requireAdmin } = require('../middlewares/auth');
const { createCategoryController } = require('../controllers/category.controller');

function createCategoryRouter(categoryService) {
  const router = Router();
  const ctrl = createCategoryController(categoryService);

  router.get('/', ctrl.list);
  router.get('/:id', ctrl.getOne);
  router.post('/', requireAdmin, ctrl.create);
  router.patch('/:id', requireAdmin, ctrl.update);
  router.delete('/:id', requireAdmin, ctrl.delete);

  return router;
}

module.exports = { createCategoryRouter };
