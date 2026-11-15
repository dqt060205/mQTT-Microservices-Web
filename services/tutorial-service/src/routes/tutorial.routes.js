const { Router } = require('express');
const { requireAdmin } = require('../middlewares/auth');
const { createTutorialController } = require('../controllers/tutorial.controller');

function createTutorialRouter(tutorialService) {
  const router = Router();
  const ctrl = createTutorialController(tutorialService);

  router.get('/', ctrl.list);
  router.get('/product/:productId', ctrl.listByProduct);
  router.get('/slug/:slug', ctrl.getBySlug);
  router.get('/:id', ctrl.getOne);
  router.post('/', requireAdmin, ctrl.create);
  router.patch('/:id', requireAdmin, ctrl.update);
  router.delete('/:id', requireAdmin, ctrl.delete);

  return router;
}

module.exports = { createTutorialRouter };
