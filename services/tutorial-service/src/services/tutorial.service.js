const { AppError } = require('../lib/errors');

function createTutorialService({ prisma }) {
  async function listTutorials(filters) {
    const { page, limit, search, productId, category, difficulty, sortBy, sortOrder } = filters;
    const where = { isPublished: true };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (productId) where.productId = productId;
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (difficulty) where.difficulty = difficulty;

    const [items, total] = await prisma.$transaction([
      prisma.tutorial.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tutorial.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async function getTutorialById(id) {
    const tutorial = await prisma.tutorial.findFirst({ where: { id, isPublished: true } });
    if (!tutorial) throw new AppError(404, 'Tutorial was not found');
    return tutorial;
  }

  async function getTutorialBySlug(slug) {
    const tutorial = await prisma.tutorial.findFirst({ where: { slug, isPublished: true } });
    if (!tutorial) throw new AppError(404, 'Tutorial was not found');
    return tutorial;
  }

  async function listTutorialsByProduct(productId, filters) {
    return listTutorials({ ...filters, productId });
  }

  async function createTutorial(input) {
    return prisma.tutorial.create({ data: input });
  }

  async function updateTutorial(id, input) {
    const existing = await prisma.tutorial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError(404, 'Tutorial was not found');
    return prisma.tutorial.update({ where: { id }, data: input });
  }

  async function deleteTutorial(id) {
    const existing = await prisma.tutorial.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new AppError(404, 'Tutorial was not found');
    await prisma.tutorial.delete({ where: { id } });
  }

  return { listTutorials, listTutorialsByProduct, getTutorialById, getTutorialBySlug, createTutorial, updateTutorial, deleteTutorial };
}

module.exports = { createTutorialService };
