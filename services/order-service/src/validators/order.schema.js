const { z } = require('zod');

const ORDER_STATUSES = ['PENDING', 'PAID', 'PAYMENT_FAILED', 'CANCELLED', 'SHIPPED', 'DELIVERED'];

const createOrderSchema = z.object({
  shippingName: z.string().trim().min(1).max(100),
  shippingPhone: z.string().trim().min(8).max(20),
  shippingAddress: z.string().trim().min(5).max(255),
});

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(ORDER_STATUSES).optional(),
});

module.exports = { createOrderSchema, listOrdersQuerySchema };
