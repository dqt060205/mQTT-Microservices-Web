import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@mqtt.local' }
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await prisma.user.create({
      data: {
        email: 'admin@mqtt.local',
        passwordHash,
        fullName: 'System Administrator',
        role: 'ADMIN',
        isActive: true
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });