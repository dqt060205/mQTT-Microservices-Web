import prisma from '../config/prisma.js';
import { ApiError } from '../utils/api-error.js';

function serializeCategory(category) {
  if (!category._count) {
    return category;
  }

  const { _count, ...data } = category;

  return {
    ...data,
    productCount: _count.products
  };
}

export async function listCategories() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return categories.map(serializeCategory);
}

export async function getCategoryById(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  if (!category) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
  }

  return serializeCategory(category);
}

export async function createCategory(input) {
  return prisma.category.create({
    data: input
  });
}

export async function updateCategory(id, input) {
  const existingCategory = await prisma.category.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingCategory) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
  }

  return prisma.category.update({
    where: { id },
    data: input
  });
}

export async function deleteCategory(id) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          products: true
        }
      }
    }
  });

  if (!category) {
    throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category was not found.');
  }

  if (category._count.products > 0) {
    throw new ApiError(
      409,
      'CATEGORY_NOT_EMPTY',
      'Move or delete the products in this category before deleting it.',
      { productCount: category._count.products }
    );
  }

  await prisma.category.delete({
    where: { id }
  });
}
