const { z } = require('zod');
const { slugify } = require('../utils/slug');

const createCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'Category name is required').max(120),
    slug: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.name),
  }));

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

module.exports = {
  createCategorySchema,
  updateCategorySchema,
};

