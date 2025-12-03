-- SQL скрипт для диагностики проблемы с языком курсов
-- Выполните этот скрипт для проверки данных

-- 1. Проверка всех курсов и их языков
SELECT 
  id,
  slug,
  title,
  language,
  "isPublished",
  "publishedAt",
  "createdAt"
FROM "Course"
ORDER BY "createdAt" DESC;

-- 2. Подсчет курсов по языкам
SELECT 
  language,
  COUNT(*) as course_count,
  COUNT(*) FILTER (WHERE "isPublished" = true) as published_count
FROM "Course"
GROUP BY language
ORDER BY language;

-- 3. Проверка опубликованных курсов по языкам
SELECT 
  language,
  COUNT(*) as published_courses
FROM "Course"
WHERE "isPublished" = true
GROUP BY language
ORDER BY language;

-- 4. Детальная информация о курсах с языком SR
SELECT 
  id,
  slug,
  title,
  language,
  "isPublished",
  category,
  "coverImageUrl"
FROM "Course"
WHERE language = 'SR'
ORDER BY title;

-- 5. Детальная информация о курсах с языком RU
SELECT 
  id,
  slug,
  title,
  language,
  "isPublished",
  category,
  "coverImageUrl"
FROM "Course"
WHERE language = 'RU'
ORDER BY title;

-- 6. Проверка курсов с NULL языком (если такие есть)
SELECT 
  id,
  slug,
  title,
  language,
  "isPublished"
FROM "Course"
WHERE language IS NULL;

-- 7. Обновление NULL языков на SR (если нужно)
-- UPDATE "Course"
-- SET language = 'SR'
-- WHERE language IS NULL;

