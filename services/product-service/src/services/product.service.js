import prisma from '../config/prisma.js';
import { ApiError } from '../utils/api-error.js';
import { isUuid } from '../validation/product.validation.js';

const productInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  }
};

function serializeProduct(product) {
  return {
    ...product,
    price: product.price.toString()
  };
}

async function ensureCategoryExists(categoryId) {
  if (!categoryId) {
    return;
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true }
  });

  if (!category) {
    throw new ApiError(
      400,
      'CATEGORY_NOT_FOUND',
      'The selected category does not exist.',
      [{ field: 'categoryId', message: 'Category was not found.' }]
    );
  }
}

export async function listProducts(filters) {
  const {
    page,
    limit,
    search,
    category,
    minPrice,
    maxPrice,
    inStock,
    sortBy,
    sortOrder
  } = filters;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (category) {
    if (isUuid(category)) {
      where.categoryId = category;
    } else {
      where.category = {
        is: {
          slug: category
        }
      };
    }
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};

    if (minPrice !== undefined) {
      where.price.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.price.lte = maxPrice;
    }
  }

  if (inStock !== undefined) {
    where.stock = inStock ? { gt: 0 } : 0;
  }

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: {
        [sortBy]: sortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.product.count({ where })
  ]);

  return {
    items: products.map(serializeProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude
  });

  if (!product) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
  }

  return serializeProduct(product);
}

export async function createProduct(input) {
  await ensureCategoryExists(input.categoryId);

  const product = await prisma.product.create({
    data: input,
    include: productInclude
  });

  return serializeProduct(product);
}

export async function updateProduct(id, input) {
  await ensureCategoryExists(input.categoryId);

  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingProduct) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
  }

  const product = await prisma.product.update({
    where: { id },
    data: input,
    include: productInclude
  });

  return serializeProduct(product);
}

export async function deleteProduct(id) {
  const existingProduct = await prisma.product.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!existingProduct) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
  }

  await prisma.product.delete({
    where: { id }
  });
}
