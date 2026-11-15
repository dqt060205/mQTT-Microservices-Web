const { z } = require('zod');
const { slugify } = require('../utils/slug');

const difficultySchema = z.enum(['Beginner', 'Intermediate', 'Advanced']);
const nullableUrl = z.string().trim().url('Invalid URL').nullable().optional().or(z.literal(''));

const createTutorialSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(180),
    slug: z.string().trim().min(1).max(220).optional(),
    excerpt: z.string().trim().max(1200).nullable().optional(),
    content: z.string().trim().min(1, 'Content is required').max(200000),
    imageUrl: nullableUrl,
    videoUrl: nullableUrl,
    productId: z.string().uuid('Invalid product ID').nullable().optional(),
    category: z.string().trim().min(1).max(100).nullable().optional(),
    difficulty: difficultySchema.nullable().optional(),
    readTime: z.coerce.number().int().min(0).max(180).optional(),
    isPublished: z.boolean().optional().default(false),
    authorName: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.title),
    excerpt: data.excerpt || null,
    imageUrl: data.imageUrl || null,
    videoUrl: data.videoUrl || null,
    productId: data.productId || null,
    category: data.category || null,
    difficulty: data.difficulty || null,
    authorName: data.authorName || null,
    readTime: data.readTime ?? 0,
  }));

const updateTutorialSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    slug: z.string().trim().min(1).max(220).optional(),
    excerpt: z.string().trim().max(1200).nullable().optional(),
    content: z.string().trim().min(1).max(200000).optional(),
    imageUrl: nullableUrl,
    videoUrl: nullableUrl,
    productId: z.string().uuid('Invalid product ID').nullable().optional(),
    category: z.string().trim().min(1).max(100).nullable().optional(),
    difficulty: difficultySchema.nullable().optional(),
    readTime: z.coerce.number().int().min(0).max(180).optional(),
    isPublished: z.boolean().optional(),
    authorName: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .transform((data) => {
    const result = { ...data };
    for (const field of ['excerpt', 'imageUrl', 'videoUrl', 'productId', 'category', 'difficulty', 'authorName']) {
      if (result[field] === '') result[field] = null;
    }
    return result;
  });

const listTutorialsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  productId: z.string().uuid('Invalid product ID').optional(),
  category: z.string().trim().optional(),
  difficulty: difficultySchema.optional(),
  sortBy: z.enum(['createdAt', 'title', 'readTime', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = { createTutorialSchema, updateTutorialSchema, listTutorialsQuerySchema };
