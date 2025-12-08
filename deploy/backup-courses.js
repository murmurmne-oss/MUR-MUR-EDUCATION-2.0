#!/usr/bin/env node
// Скрипт для резервного копирования всех курсов и связанных данных

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function backupCourses() {
  console.log('\n📦 Начинаю резервное копирование курсов...\n');

  try {
    // Получаем все курсы со всеми связанными данными
    const courses = await prisma.course.findMany({
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                attachments: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
        tests: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        forms: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        accessCodes: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`✅ Найдено курсов: ${courses.length}`);

    // Подсчитываем статистику
    let totalModules = 0;
    let totalLessons = 0;
    let totalAttachments = 0;
    let totalTests = 0;
    let totalForms = 0;
    let totalAccessCodes = 0;

    courses.forEach((course) => {
      totalModules += course.modules.length;
      course.modules.forEach((module) => {
        totalLessons += module.lessons.length;
        module.lessons.forEach((lesson) => {
          totalAttachments += lesson.attachments.length;
        });
      });
      totalTests += course.tests.length;
      totalForms += course.forms.length;
      totalAccessCodes += course.accessCodes.length;
    });

    console.log(`   - Модулей: ${totalModules}`);
    console.log(`   - Уроков: ${totalLessons}`);
    console.log(`   - Вложений: ${totalAttachments}`);
    console.log(`   - Тестов: ${totalTests}`);
    console.log(`   - Форм: ${totalForms}`);
    console.log(`   - Кодов доступа: ${totalAccessCodes}\n`);

    // Создаем объект бэкапа с метаданными
    const backup = {
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        timestamp: Date.now(),
        coursesCount: courses.length,
        statistics: {
          modules: totalModules,
          lessons: totalLessons,
          attachments: totalAttachments,
          tests: totalTests,
          forms: totalForms,
          accessCodes: totalAccessCodes,
        },
      },
      courses: courses,
    };

    // Создаем имя файла с датой и временем
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `courses-backup-${timestamp}.json`;
    const backupDir = path.join(__dirname, 'backups');
    
    // Создаем директорию для бэкапов, если её нет
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Создана директория для бэкапов: ${backupDir}`);
    }

    const filepath = path.join(backupDir, filename);

    // Сохраняем бэкап
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');

    const fileSize = (fs.statSync(filepath).size / 1024).toFixed(2);
    console.log(`💾 Бэкап сохранен: ${filepath}`);
    console.log(`   Размер файла: ${fileSize} KB\n`);

    // Также создаем симлинк на последний бэкап для удобства
    const latestBackupPath = path.join(backupDir, 'courses-backup-latest.json');
    if (fs.existsSync(latestBackupPath)) {
      fs.unlinkSync(latestBackupPath);
    }
    fs.symlinkSync(filename, latestBackupPath);
    console.log(`🔗 Создан симлинк: ${latestBackupPath} -> ${filename}\n`);

    console.log('✅ Резервное копирование завершено успешно!\n');

    return filepath;
  } catch (error) {
    console.error('❌ Ошибка при создании бэкапа:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем бэкап
backupCourses()
  .then((filepath) => {
    console.log(`📦 Бэкап готов: ${filepath}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

