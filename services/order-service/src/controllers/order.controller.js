const { createOrderSchema, listOrdersQuerySchema } = require('../validators/order.schema');
const { toOrderDTO } = require('../utils/serialize');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function createOrderController(orderService) {
  return {
    create: asyncHandler(async (req, res) => {
      const shipping = createOrderSchema.parse(req.body);
      const order = await orderService.createOrder({
        userId: req.user.id,
        token: req.token,
        shipping,
      });
      res.status(201).json(toOrderDTO(order));
    }),

    list: asyncHandler(async (req, res) => {
      const query = listOrdersQuerySchema.parse(req.query);
      const result = await orderService.listOrders({ userId: req.user.id, ...query });
      res.json({ data: result.data.map(toOrderDTO), pagination: result.pagination });
    }),

    getOne: asyncHandler(async (req, res) => {
      const order = await orderService.getOrder({
        id: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      res.json(toOrderDTO(order));
    }),

    cancel: asyncHandler(async (req, res) => {
      const order = await orderService.cancelOrder({
        id: req.params.id,
        userId: req.user.id,
        role: req.user.role,
      });
      res.json(toOrderDTO(order));
    }),
  };
}

module.exports = { createOrderController };
