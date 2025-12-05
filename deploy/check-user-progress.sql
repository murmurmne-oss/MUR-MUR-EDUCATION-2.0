-- Скрипт для проверки прогресса пользователя
-- Замените 'USER_ID' на реальный ID пользователя

-- 1. Проверка enrollment
SELECT 
    ce.id,
    ce."userId",
    ce."courseId",
    ce.status,
    ce."accessType",
    ce."createdAt",
    ce."updatedAt",
    c.title as course_title,
    c.slug as course_slug
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = 'USER_ID'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ USER_ID
ORDER BY ce."createdAt" DESC;

-- 2. Проверка прогресса по урокам
SELECT 
    cp.id,
    cp."userId",
    cp."lessonId",
    cp.status,
    cp."progressPercent",
    cp."startedAt",
    cp."completedAt",
    cp."lastViewedAt",
    cp."createdAt",
    cp."updatedAt",
    l.title as lesson_title,
    l."order" as lesson_order,
    m.title as module_title,
    m."order" as module_order,
    c.title as course_title,
    c.slug as course_slug
FROM "CourseProgress" cp
JOIN "Lesson" l ON cp."lessonId" = l.id
JOIN "CourseModule" m ON l."moduleId" = m.id
JOIN "Course" c ON m."courseId" = c.id
WHERE cp."userId" = 'USER_ID'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ USER_ID
ORDER BY cp."updatedAt" DESC;

-- 3. Проверка логов на наличие сбросов прогресса
SELECT 
    al.id,
    al."actorId",
    al."actorType",
    al.action,
    al."metadata",
    al."createdAt"
FROM "ActivityLog" al
WHERE al.action = 'admin.progress.reset'
AND (al."metadata"->>'userId')::text = 'USER_ID'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ USER_ID
ORDER BY al."createdAt" DESC
LIMIT 10;

-- 4. Проверка последних действий пользователя
SELECT 
    al.id,
    al."actorId",
    al."actorType",
    al.action,
    al."metadata",
    al."createdAt"
FROM "ActivityLog" al
WHERE al."actorId" = 'USER_ID'  -- ЗАМЕНИТЕ НА РЕАЛЬНЫЙ USER_ID
AND al.action LIKE '%progress%'
ORDER BY al."createdAt" DESC
LIMIT 20;

