const {
  listTutorialsQuerySchema,
  createTutorialSchema,
  updateTutorialSchema,
} = require('../validators/tutorial.schema');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createTutorialController(tutorialService) {
  return {
    list: asyncHandler(async (req, res) => {
      const filters = listTutorialsQuerySchema.parse(req.query);
      const result = await tutorialService.listTutorials(filters);
      res.json({ data: result.items, items: result.items, pagination: result.pagination });
    }),
    getOne: asyncHandler(async (req, res) => {
      res.json(await tutorialService.getTutorialById(req.params.id));
    }),
    getBySlug: asyncHandler(async (req, res) => {
      res.json(await tutorialService.getTutorialBySlug(req.params.slug));
    }),
    listByProduct: asyncHandler(async (req, res) => {
      const filters = listTutorialsQuerySchema.parse(req.query);
      const result = await tutorialService.listTutorialsByProduct(req.params.productId, filters);
      res.json({ data: result.items, items: result.items, pagination: result.pagination });
    }),
    create: asyncHandler(async (req, res) => {
      const input = createTutorialSchema.parse(req.body);
      res.status(201).json(await tutorialService.createTutorial(input));
    }),
    update: asyncHandler(async (req, res) => {
      const input = updateTutorialSchema.parse(req.body);
      res.json(await tutorialService.updateTutorial(req.params.id, input));
    }),
    delete: asyncHandler(async (req, res) => {
      await tutorialService.deleteTutorial(req.params.id);
      res.status(204).end();
    }),
  };
}

module.exports = { createTutorialController };
