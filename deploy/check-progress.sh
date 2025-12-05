#!/bin/bash
# Скрипт для проверки прогресса пользователя через backend контейнер

echo "🔍 Проверка прогресса пользователя"
echo ""
echo "Введите User ID пользователя:"
read USER_ID

if [ -z "$USER_ID" ]; then
    echo "❌ User ID не может быть пустым"
    exit 1
fi

echo ""
echo "📊 Проверка enrollment для пользователя $USER_ID..."
echo ""

# Подключаемся к базе через backend контейнер
docker compose -f docker-compose.prod.yml exec -T backend sh -c 'psql "$DATABASE_URL" <<EOF
-- Проверка enrollment
SELECT 
    ce.id,
    ce."userId",
    ce."courseId",
    ce.status,
    ce."accessType",
    c.title as course_title,
    c.slug as course_slug
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = '\''$USER_ID'\''
ORDER BY ce."createdAt" DESC;
EOF
'

echo ""
echo "📈 Проверка прогресса по урокам..."
echo ""

docker compose -f docker-compose.prod.yml exec -T backend sh -c 'psql "$DATABASE_URL" <<EOF
SELECT 
    cp.status,
    cp."progressPercent",
    cp."completedAt",
    l.title as lesson_title,
    m.title as module_title,
    c.title as course_title
FROM "CourseProgress" cp
JOIN "Lesson" l ON cp."lessonId" = l.id
JOIN "CourseModule" m ON l."moduleId" = m.id
JOIN "Course" c ON m."courseId" = c.id
WHERE cp."userId" = '\''$USER_ID'\''
ORDER BY cp."updatedAt" DESC
LIMIT 20;
EOF
'

echo ""
echo "📋 Проверка логов на наличие сбросов..."
echo ""

docker compose -f docker-compose.prod.yml exec -T backend sh -c 'psql "$DATABASE_URL" <<EOF
SELECT 
    al.action,
    al."actorId",
    al."metadata",
    al."createdAt"
FROM "ActivityLog" al
WHERE al.action = '\''admin.progress.reset'\''
AND (al."metadata"->>'\''userId'\'')::text = '\''$USER_ID'\''
ORDER BY al."createdAt" DESC
LIMIT 10;
EOF
'

echo ""
echo "✅ Проверка завершена"

