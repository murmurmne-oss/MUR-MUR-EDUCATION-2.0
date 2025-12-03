// Скрипт для исправления языка курса через Prisma Client
// Использование: node fix-course-language.js <slug> <language>

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || 'eros-everyday-srb';
  const language = process.argv[3] || 'SR';

  console.log(`Обновление языка курса: ${slug} -> ${language}`);

  const course = await prisma.course.update({
    where: { slug },
    data: { language },
    select: {
      id: true,
      slug: true,
      title: true,
      language: true,
      isPublished: true,
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

