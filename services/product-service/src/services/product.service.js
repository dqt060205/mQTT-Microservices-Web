const { AppError } = require('../lib/errors');

const productInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createProductService({ prisma }) {
  async function listProducts(filters) {
    const { page, limit, search, category, minPrice, maxPrice, inStock, sortBy, sortOrder } = filters;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      if (UUID_REGEX.test(category)) {
        where.categoryId = category;
      } else {
        where.category = { is: { slug: category } };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (inStock !== undefined) {
      where.stock = inStock ? { gt: 0 } : 0;
    }

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async function getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      throw new AppError(404, 'Product was not found');
    }

    return product;
  }

  async function createProduct(input) {
    if (input.categoryId) {
      const exists = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!exists) throw new AppError(400, 'Selected category does not exist');
    }

    return prisma.product.create({
      data: input,
      include: productInclude,
    });
  }

  async function updateProduct(id, input) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Product was not found');

    if (input.categoryId) {
      const exists = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!exists) throw new AppError(400, 'Selected category does not exist');
    }

    return prisma.product.update({
      where: { id },
      data: input,
      include: productInclude,
    });
  }

  async function deleteProduct(id) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Product was not found');

    await prisma.product.delete({ where: { id } });
  }

  return {
    listProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

module.exports = { createProductService };
