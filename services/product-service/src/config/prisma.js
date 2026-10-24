import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.productServicePrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.productServicePrisma = prisma;
}

export default prisma;
