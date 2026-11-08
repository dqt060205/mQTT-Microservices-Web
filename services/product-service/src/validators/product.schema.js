const { z } = require('zod');
const { slugify } = require('../utils/slug');

const createProductSchema = z
  .object({
    name: z.string().trim().min(1, 'Product name is required').max(180),
    slug: z.string().trim().min(1).max(200).optional(),
    sku: z.string().trim().min(1, 'SKU is required').max(80).transform((v) => v.toUpperCase()),
    description: z.string().trim().max(5000).optional().nullable(),
    price: z.coerce.number().positive('Price must be greater than 0'),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
    imageUrl: z.string().trim().url('Invalid image URL').optional().nullable().or(z.literal('')),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.name),
    imageUrl: data.imageUrl || null,
    categoryId: data.categoryId || null,
  }));

const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(180).optional(),
    slug: z.string().trim().min(1).max(200).optional(),
    sku: z.string().trim().min(1).max(80).transform((v) => v.toUpperCase()).optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    price: z.coerce.number().positive('Price must be greater than 0').optional(),
    stock: z.coerce.number().int().min(0, 'Stock cannot be negative').optional(),
    imageUrl: z.string().trim().url('Invalid image URL').optional().nullable().or(z.literal('')),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .transform((data) => {
    const result = { ...data };
    if (result.imageUrl === '') result.imageUrl = null;
    return result;
  });

const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'price', 'stock']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
};

