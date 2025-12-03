-- SQL скрипт для обновления URL с http:// на https:// для api.murmurmne.com
-- Выполните этот скрипт на production базе данных

BEGIN;

-- 1. Обновление прямых URL полей в таблице Course
UPDATE "Course"
SET "coverImageUrl" = REPLACE("coverImageUrl", 'http://api.murmurmne.com', 'https://api.murmurmne.com')
WHERE "coverImageUrl" LIKE 'http://api.murmurmne.com%';

UPDATE "Course"
SET "promoVideoUrl" = REPLACE("promoVideoUrl", 'http://api.murmurmne.com', 'https://api.murmurmne.com')
WHERE "promoVideoUrl" LIKE 'http://api.murmurmne.com%';

-- 2. Обновление URL в таблице Lesson
UPDATE "Lesson"
SET "videoUrl" = REPLACE("videoUrl", 'http://api.murmurmne.com', 'https://api.murmurmne.com')
WHERE "videoUrl" LIKE 'http://api.murmurmne.com%';

-- 3. Обновление URL в таблице LessonAttachment
UPDATE "LessonAttachment"
SET "url" = REPLACE("url", 'http://api.murmurmne.com', 'https://api.murmurmne.com')
WHERE "url" LIKE 'http://api.murmurmne.com%';

-- 4. Обновление URL в таблице User (аватары)
UPDATE "User"
SET "avatarUrl" = REPLACE("avatarUrl", 'http://api.murmurmne.com', 'https://api.murmurmne.com')
WHERE "avatarUrl" LIKE 'http://api.murmurmne.com%';

-- 5. Обновление URL внутри JSON поля Lesson.content
-- Используем простой подход: заменяем строку в JSON тексте
-- Это работает для всех структур JSON (массив блоков, объект с blocks, и т.д.)
UPDATE "Lesson"
SET "content" = REPLACE("content"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "content" IS NOT NULL
  AND ("content"::text LIKE '%http://api.murmurmne.com%');

-- 6. Обновление URL в JSON полях CourseTest.questions (если там есть изображения)
UPDATE "CourseTest"
SET "questions" = REPLACE("questions"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "questions" IS NOT NULL
  AND ("questions"::text LIKE '%http://api.murmurmne.com%');

-- 7. Обновление URL в JSON полях CourseForm.questions и results
UPDATE "CourseForm"
SET "questions" = REPLACE("questions"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "questions" IS NOT NULL
  AND ("questions"::text LIKE '%http://api.murmurmne.com%');

UPDATE "CourseForm"
SET "results" = REPLACE("results"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "results" IS NOT NULL
  AND ("results"::text LIKE '%http://api.murmurmne.com%');

-- 8. Обновление URL в JSON полях FormAttempt.responses
UPDATE "FormAttempt"
SET "responses" = REPLACE("responses"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "responses" IS NOT NULL
  AND ("responses"::text LIKE '%http://api.murmurmne.com%');

-- 9. Обновление URL в JSON полях TestAttempt.responses
UPDATE "TestAttempt"
SET "responses" = REPLACE("responses"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "responses" IS NOT NULL
  AND ("responses"::text LIKE '%http://api.murmurmne.com%');

-- 10. Обновление URL в JSON полях ActivityLog.metadata
UPDATE "ActivityLog"
SET "metadata" = REPLACE("metadata"::text, 'http://api.murmurmne.com', 'https://api.murmurmne.com')::jsonb
WHERE "metadata" IS NOT NULL
  AND ("metadata"::text LIKE '%http://api.murmurmne.com%');

COMMIT;

-- Проверка результатов (выполните после COMMIT для проверки)
-- SELECT COUNT(*) as courses_with_http FROM "Course" WHERE "coverImageUrl" LIKE 'http://api.murmurmne.com%' OR "promoVideoUrl" LIKE 'http://api.murmurmne.com%';
-- SELECT COUNT(*) as lessons_with_http FROM "Lesson" WHERE "videoUrl" LIKE 'http://api.murmurmne.com%' OR ("content"::text LIKE '%http://api.murmurmne.com%');
-- SELECT COUNT(*) as attachments_with_http FROM "LessonAttachment" WHERE "url" LIKE 'http://api.murmurmne.com%';

