-- SQL скрипт для исправления языка курса
-- Используйте этот скрипт, если язык курса был неправильно установлен после копирования

-- 1. Просмотр всех курсов с их языками
SELECT 
  id,
  slug,
  title,
  language,
  "isPublished",
  "createdAt"
FROM "Course"
ORDER BY "createdAt" DESC;

-- 2. Обновление языка конкретного курса по slug
-- Замените 'course-slug-here' на реальный slug курса
-- Замените 'SR' на нужный язык ('SR' или 'RU')
-- UPDATE "Course"
-- SET language = 'SR'
-- WHERE slug = 'course-slug-here';

-- 3. Обновление языка всех курсов, которые были скопированы (имеют '-copy-' в slug)
-- и имеют неправильный язык
-- UPDATE "Course"
-- SET language = 'SR'
-- WHERE slug LIKE '%-copy-%'
--   AND language = 'RU';

-- 4. Обновление языка курса по ID (если знаете ID)
-- UPDATE "Course"
-- SET language = 'SR'
-- WHERE id = 'course-id-here';

-- 5. Проверка результата после обновления
-- SELECT 
--   id,
--   slug,
--   title,
--   language,
--   "isPublished"
-- FROM "Course"
-- WHERE slug = 'course-slug-here';

