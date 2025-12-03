// Скрипт для исправления языка курса через Prisma Client
// Использование: node fix-course-language.js <slug> <language> [--publish]

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || 'eros-everyday-srb';
  const language = process.argv[3] || 'SR';
  const shouldPublish = process.argv.includes('--publish');

  console.log(`Обновление языка курса: ${slug} -> ${language}`);
  if (shouldPublish) {
    console.log('Также публикуем курс...');
  }

  const updateData = { language };
  if (shouldPublish) {
    updateData.isPublished = true;
    updateData.publishedAt = new Date();
  }

  const course = await prisma.course.update({
    where: { slug },
    data: updateData,
    select: {
      id: true,
      slug: true,
      title: true,
      language: true,
      isPublished: true,
      publishedAt: true,
    },
  });

  console.log('Курс обновлен:');
  console.log(JSON.stringify(course, null, 2));
}

main()
  .catch((e) => {
    console.error('Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

