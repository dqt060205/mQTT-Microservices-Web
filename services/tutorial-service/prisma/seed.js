const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tutorial.upsert({
    where: { slug: 'getting-started-with-esp32' },
    update: {},
    create: {
      title: 'Getting Started with ESP32',
      slug: 'getting-started-with-esp32',
      excerpt: 'A practical introduction to setting up an ESP32 development board.',
      content: 'Learn how to prepare your ESP32 development environment, connect the board, and upload your first program. Install the Arduino IDE, select the correct board and port, then run a simple LED blink example to verify your setup.',
      category: 'Development Boards',
      difficulty: 'Beginner',
      readTime: 8,
      isPublished: true,
      authorName: 'mQTT Team',
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
