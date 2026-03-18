import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a demo learner
  const learner = await prisma.learner.create({
    data: {
      name: 'Demo Learner',
      avatar: '🦊',
    },
  });

  console.log(`Created learner: ${learner.name} (${learner.id})`);

  // Initialize progress records for numbers 0-9
  const numbers = Array.from({ length: 10 }, (_, i) => i.toString());
  for (const num of numbers) {
    await prisma.progress.create({
      data: {
        learnerId: learner.id,
        moduleType: 'numbers',
        item: num,
        masteryLevel: 0,
      },
    });
  }

  // Initialize progress records for alphabet A-Z
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (const letter of alphabet) {
    await prisma.progress.create({
      data: {
        learnerId: learner.id,
        moduleType: 'alphabet',
        item: letter,
        masteryLevel: 0,
      },
    });
  }

  console.log('Created initial progress records');
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
