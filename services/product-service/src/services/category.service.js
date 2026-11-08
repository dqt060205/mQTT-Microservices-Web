const { AppError } = require('../lib/errors');

function createCategoryService({ prisma }) {
  async function listCategories() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async function getCategoryById(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category was not found');
    }

    return category;
  }

  async function createCategory(input) {
    return prisma.category.create({
      data: input,
    });
  }

  async function updateCategory(id, input) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Category was not found');

    return prisma.category.update({
      where: { id },
      data: input,
    });
  }

  async function deleteCategory(id) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      throw new AppError(404, 'Category was not found');
    }

    if (category._count.products > 0) {
      throw new AppError(409, 'Move or delete the products in this category before deleting it');
    }

    await prisma.category.delete({ where: { id } });
  }

  return {
    listCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

module.exports = { createCategoryService };
