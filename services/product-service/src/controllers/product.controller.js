const {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
} = require('../validators/product.schema');
const { toProductDTO } = require('../utils/serialize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createProductController(productService) {
  return {
    list: asyncHandler(async (req, res) => {
      const filters = listProductsQuerySchema.parse(req.query);
      const result = await productService.listProducts(filters);
      const items = result.items.map(toProductDTO);
      res.json({
        data: items,
        items,
        pagination: result.pagination,
      });
    }),

    getOne: asyncHandler(async (req, res) => {
      const product = await productService.getProductById(req.params.id);
      res.json(toProductDTO(product));
    }),

    create: asyncHandler(async (req, res) => {
      const input = createProductSchema.parse(req.body);
      const product = await productService.createProduct(input);
      res.status(201).json(toProductDTO(product));
    }),

    update: asyncHandler(async (req, res) => {
      const input = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(req.params.id, input);
      res.json(toProductDTO(product));
    }),

    delete: asyncHandler(async (req, res) => {
      await productService.deleteProduct(req.params.id);
      res.status(204).end();
    }),
  };
}

module.exports = { createProductController };
