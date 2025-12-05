#!/usr/bin/env node
// Скрипт для проверки прогресса пользователя через Prisma

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProgress(userId) {
  console.log(`\n🔍 Проверка прогресса для пользователя: ${userId}\n`);

  try {
    // 1. Проверка enrollment
    console.log('📊 Проверка enrollment...\n');
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (enrollments.length === 0) {
      console.log('❌ Пользователь не записан ни на один курс\n');
    } else {
      console.log(`✅ Найдено enrollment: ${enrollments.length}\n`);
      enrollments.forEach((enrollment) => {
        console.log(`  - Курс: ${enrollment.course.title} (${enrollment.course.slug})`);
        console.log(`    Status: ${enrollment.status}`);
        console.log(`    Access Type: ${enrollment.accessType}`);
        console.log(`    Created: ${enrollment.createdAt}`);
        console.log('');
      });
    }

    // 2. Проверка прогресса
    console.log('📈 Проверка прогресса по урокам...\n');
    const progress = await prisma.courseProgress.findMany({
      where: { userId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    title: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    if (progress.length === 0) {
      console.log('❌ Прогресс не найден\n');
    } else {
      console.log(`✅ Найдено записей прогресса: ${progress.length}\n`);
      progress.forEach((p) => {
        console.log(`  - Урок: ${p.lesson.title}`);
        console.log(`    Модуль: ${p.lesson.module.title}`);
        console.log(`    Курс: ${p.lesson.module.course.title}`);
        console.log(`    Status: ${p.status}`);
        console.log(`    Progress: ${p.progressPercent}%`);
        if (p.completedAt) {
          console.log(`    Завершен: ${p.completedAt}`);
        }
        console.log('');
      });
    }

    // 3. Проверка логов сбросов
    console.log('📋 Проверка логов на наличие сбросов...\n');
    const resetLogs = await prisma.activityLog.findMany({
      where: {
        action: 'admin.progress.reset',
        metadata: {
          path: ['userId'],
          equals: userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (resetLogs.length === 0) {
      console.log('✅ Логов сброса не найдено\n');
    } else {
      console.log(`⚠️  Найдено логов сброса: ${resetLogs.length}\n`);
      resetLogs.forEach((log) => {
        console.log(`  - Дата: ${log.createdAt}`);
        console.log(`    Actor: ${log.actorId || 'N/A'}`);
        console.log(`    Metadata: ${JSON.stringify(log.metadata)}`);
        console.log('');
      });
    }

    // 4. Статистика
    console.log('📊 Статистика:\n');
    const totalProgress = await prisma.courseProgress.count({
      where: { userId },
    });
    const completedProgress = await prisma.courseProgress.count({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });
    const inProgress = await prisma.courseProgress.count({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
    });

    console.log(`  Всего записей прогресса: ${totalProgress}`);
    console.log(`  Завершено: ${completedProgress}`);
    console.log(`  В процессе: ${inProgress}`);
    console.log('');

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Получаем userId из аргументов командной строки
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Укажите User ID как аргумент');
  console.error('Использование: node check-progress.js <USER_ID>');
  process.exit(1);
}

checkProgress(userId);

