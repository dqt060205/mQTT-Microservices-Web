const {
  createCategorySchema,
  updateCategorySchema,
} = require('../validators/category.schema');
const { toCategoryDTO } = require('../utils/serialize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createCategoryController(categoryService) {
  return {
    list: asyncHandler(async (req, res) => {
      const categories = await categoryService.listCategories();
      res.json(categories.map(toCategoryDTO));
    }),

    getOne: asyncHandler(async (req, res) => {
      const category = await categoryService.getCategoryById(req.params.id);
      res.json(toCategoryDTO(category));
    }),

    create: asyncHandler(async (req, res) => {
      const input = createCategorySchema.parse(req.body);
      const category = await categoryService.createCategory(input);
      res.status(201).json(toCategoryDTO(category));
    }),

    update: asyncHandler(async (req, res) => {
      const input = updateCategorySchema.parse(req.body);
      const category = await categoryService.updateCategory(req.params.id, input);
      res.json(toCategoryDTO(category));
    }),

    delete: asyncHandler(async (req, res) => {
      await categoryService.deleteCategory(req.params.id);
      res.status(204).end();
    }),
  };
}

module.exports = { createCategoryController };
