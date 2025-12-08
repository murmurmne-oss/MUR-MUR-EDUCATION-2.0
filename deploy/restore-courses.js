#!/usr/bin/env node
// Скрипт для восстановления курсов из резервной копии

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreCourses(backupFilePath, options = {}) {
  const { dryRun = false, skipExisting = false } = options;

  console.log('\n🔄 Начинаю восстановление курсов...\n');

  if (dryRun) {
    console.log('⚠️  РЕЖИМ ПРОВЕРКИ (dry-run): изменения не будут применены\n');
  }

  try {
    // Проверяем существование файла
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Файл бэкапа не найден: ${backupFilePath}`);
    }

    // Читаем бэкап
    console.log(`📖 Читаю файл бэкапа: ${backupFilePath}\n`);
    const backupContent = fs.readFileSync(backupFilePath, 'utf8');
    const backup = JSON.parse(backupContent);

    // Проверяем структуру бэкапа
    if (!backup.metadata || !backup.courses) {
      throw new Error('Неверный формат файла бэкапа');
    }

    console.log(`📊 Метаданные бэкапа:`);
    console.log(`   - Версия: ${backup.metadata.version}`);
    console.log(`   - Дата создания: ${backup.metadata.createdAt}`);
    console.log(`   - Количество курсов: ${backup.metadata.coursesCount}`);
    console.log(`   - Статистика: ${JSON.stringify(backup.metadata.statistics, null, 2)}\n`);

    const courses = backup.courses;
    console.log(`📚 Найдено курсов для восстановления: ${courses.length}\n`);

    let restored = 0;
    let skipped = 0;
    let errors = 0;

    // Восстанавливаем каждый курс
    for (const courseData of courses) {
      try {
        // Проверяем, существует ли курс с таким slug
        const existingCourse = await prisma.course.findUnique({
          where: { slug: courseData.slug },
        });

        if (existingCourse) {
          if (skipExisting) {
            console.log(`⏭️  Пропущен (уже существует): ${courseData.title} (${courseData.slug})`);
            skipped++;
            continue;
          } else {
            console.log(`⚠️  Курс уже существует: ${courseData.title} (${courseData.slug})`);
            console.log(`   Используйте --skip-existing для пропуска существующих курсов`);
            errors++;
            continue;
          }
        }

        if (dryRun) {
          console.log(`[DRY-RUN] Восстановление: ${courseData.title} (${courseData.slug})`);
          restored++;
          continue;
        }

        console.log(`🔄 Восстанавливаю: ${courseData.title} (${courseData.slug})`);

        // Сохраняем оригинальные ID для восстановления связей
        const moduleIdMap = new Map(); // oldId -> newId
        const lessonIdMap = new Map(); // oldId -> newId
        const testIdMap = new Map(); // oldId -> newId
        const formIdMap = new Map(); // oldId -> newId

        // Создаем курс
        const course = await prisma.course.create({
          data: {
            slug: courseData.slug,
            title: courseData.title,
            shortDescription: courseData.shortDescription,
            description: courseData.description,
            coverImageUrl: courseData.coverImageUrl,
            promoVideoUrl: courseData.promoVideoUrl,
            category: courseData.category,
            language: courseData.language,
            level: courseData.level,
            priceAmount: courseData.priceAmount,
            priceCurrency: courseData.priceCurrency,
            isFree: courseData.isFree,
            isPublished: courseData.isPublished,
            publishedAt: courseData.publishedAt,
            createdById: courseData.createdById,
            updatedById: courseData.updatedById,
          },
        });

        // Создаем модули
        for (const moduleData of courseData.modules || []) {
          const oldModuleId = moduleData.id;
          const module = await prisma.courseModule.create({
            data: {
              courseId: course.id,
              title: moduleData.title,
              description: moduleData.description,
              order: moduleData.order,
            },
          });
          moduleIdMap.set(oldModuleId, module.id);

          // Создаем уроки
          for (const lessonData of moduleData.lessons || []) {
            const oldLessonId = lessonData.id;
            const lesson = await prisma.lesson.create({
              data: {
                moduleId: module.id,
                title: lessonData.title,
                summary: lessonData.summary,
                content: lessonData.content,
                contentType: lessonData.contentType,
                videoUrl: lessonData.videoUrl,
                durationMinutes: lessonData.durationMinutes,
                order: lessonData.order,
                isPreview: lessonData.isPreview,
              },
            });
            lessonIdMap.set(oldLessonId, lesson.id);

            // Создаем вложения
            for (const attachmentData of lessonData.attachments || []) {
              await prisma.lessonAttachment.create({
                data: {
                  lessonId: lesson.id,
                  title: attachmentData.title,
                  url: attachmentData.url,
                  type: attachmentData.type,
                },
              });
            }
          }
        }

        // Создаем тесты (сначала без unlockModuleId/unlockLessonId)
        for (const testData of courseData.tests || []) {
          const oldTestId = testData.id;
          const test = await prisma.courseTest.create({
            data: {
              courseId: course.id,
              title: testData.title,
              description: testData.description,
              questions: testData.questions,
              // unlockModuleId и unlockLessonId обновим после создания всех тестов
            },
          });
          testIdMap.set(oldTestId, test.id);
        }

        // Обновляем unlockModuleId и unlockLessonId для тестов
        for (const testData of courseData.tests || []) {
          const newTestId = testIdMap.get(testData.id);
          if (!newTestId) continue;

          let unlockModuleId = null;
          let unlockLessonId = null;

          if (testData.unlockModuleId) {
            unlockModuleId = moduleIdMap.get(testData.unlockModuleId) || null;
            if (!unlockModuleId) {
              console.log(`   ⚠️  Предупреждение: unlockModuleId для теста "${testData.title}" не найден (${testData.unlockModuleId})`);
            }
          }
          if (testData.unlockLessonId) {
            unlockLessonId = lessonIdMap.get(testData.unlockLessonId) || null;
            if (!unlockLessonId) {
              console.log(`   ⚠️  Предупреждение: unlockLessonId для теста "${testData.title}" не найден (${testData.unlockLessonId})`);
            }
          }

          if (unlockModuleId || unlockLessonId || testData.unlockModuleId || testData.unlockLessonId) {
            await prisma.courseTest.update({
              where: { id: newTestId },
              data: {
                unlockModuleId,
                unlockLessonId,
              },
            });
          }
        }

        // Создаем формы (сначала без unlockModuleId/unlockLessonId и lessonId)
        for (const formData of courseData.forms || []) {
          const oldFormId = formData.id;
          const form = await prisma.courseForm.create({
            data: {
              courseId: course.id,
              title: formData.title,
              description: formData.description,
              type: formData.type,
              maxRating: formData.maxRating,
              questions: formData.questions,
              results: formData.results,
              // lessonId, unlockModuleId и unlockLessonId обновим после создания всех форм
            },
          });
          formIdMap.set(oldFormId, form.id);
        }

        // Обновляем lessonId, unlockModuleId и unlockLessonId для форм
        for (const formData of courseData.forms || []) {
          const newFormId = formIdMap.get(formData.id);
          if (!newFormId) continue;

          let lessonId = null;
          let unlockModuleId = null;
          let unlockLessonId = null;

          if (formData.lessonId) {
            lessonId = lessonIdMap.get(formData.lessonId) || null;
            if (!lessonId) {
              console.log(`   ⚠️  Предупреждение: lessonId для формы "${formData.title}" не найден (${formData.lessonId})`);
            }
          }
          if (formData.unlockModuleId) {
            unlockModuleId = moduleIdMap.get(formData.unlockModuleId) || null;
            if (!unlockModuleId) {
              console.log(`   ⚠️  Предупреждение: unlockModuleId для формы "${formData.title}" не найден (${formData.unlockModuleId})`);
            }
          }
          if (formData.unlockLessonId) {
            unlockLessonId = lessonIdMap.get(formData.unlockLessonId) || null;
            if (!unlockLessonId) {
              console.log(`   ⚠️  Предупреждение: unlockLessonId для формы "${formData.title}" не найден (${formData.unlockLessonId})`);
            }
          }

          if (lessonId || unlockModuleId || unlockLessonId || formData.lessonId || formData.unlockModuleId || formData.unlockLessonId) {
            await prisma.courseForm.update({
              where: { id: newFormId },
              data: {
                lessonId,
                unlockModuleId,
                unlockLessonId,
              },
            });
          }
        }

        // Создаем коды доступа
        for (const codeData of courseData.accessCodes || []) {
          await prisma.courseAccessCode.create({
            data: {
              code: codeData.code,
              courseId: course.id,
              status: codeData.status,
              note: codeData.note,
              createdBy: codeData.createdBy,
              activatedAt: codeData.activatedAt,
              activatedById: codeData.activatedById,
            },
          });
        }

        console.log(`   ✅ Восстановлен: ${courseData.title}`);
        restored++;
      } catch (error) {
        console.error(`   ❌ Ошибка при восстановлении курса ${courseData.title}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Итоги восстановления:`);
    console.log(`   ✅ Восстановлено: ${restored}`);
    console.log(`   ⏭️  Пропущено: ${skipped}`);
    console.log(`   ❌ Ошибок: ${errors}\n`);

    if (!dryRun && restored > 0) {
      console.log('✅ Восстановление завершено успешно!\n');
    } else if (dryRun) {
      console.log('✅ Проверка завершена. Для применения изменений запустите без --dry-run\n');
    }

    return { restored, skipped, errors };
  } catch (error) {
    console.error('❌ Ошибка при восстановлении:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Парсим аргументы командной строки
const args = process.argv.slice(2);
const backupFilePath = args[0];
const options = {
  dryRun: args.includes('--dry-run'),
  skipExisting: args.includes('--skip-existing'),
};

if (!backupFilePath) {
  console.error('❌ Использование: node restore-courses.js <путь-к-бэкапу> [--dry-run] [--skip-existing]');
  console.error('   --dry-run: только проверить, не применять изменения');
  console.error('   --skip-existing: пропустить курсы, которые уже существуют');
  process.exit(1);
}

// Запускаем восстановление
restoreCourses(backupFilePath, options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });

