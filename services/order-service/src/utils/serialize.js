// Prisma returns Decimal objects (serialized as strings); the API exposes numbers.
const toOrderDTO = (order) => ({
  ...order,
  totalAmount: Number(order.totalAmount),
  items: order.items?.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })),
});

module.exports = { toOrderDTO };
