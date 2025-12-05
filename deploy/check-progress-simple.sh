#!/bin/bash
# Простая проверка прогресса через временный postgres контейнер

USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
    echo "❌ Укажите User ID"
    echo "Использование: ./check-progress-simple.sh <USER_ID>"
    exit 1
fi

echo "🔍 Проверка прогресса для пользователя: $USER_ID"
echo ""

# Получаем DATABASE_URL из backend контейнера
DB_URL=$(docker compose -f docker-compose.prod.yml exec -T backend sh -c 'echo $DATABASE_URL' | tr -d '\r')

if [ -z "$DB_URL" ]; then
    echo "❌ Не удалось получить DATABASE_URL"
    exit 1
fi

echo "📊 Проверка enrollment..."
echo ""

docker run --rm -i postgres:15 psql "$DB_URL" <<EOF
SELECT 
    ce.id,
    ce."userId",
    ce."courseId",
    ce.status,
    c.title as course_title,
    c.slug as course_slug
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = '$USER_ID'
ORDER BY ce."createdAt" DESC;
EOF

echo ""
echo "📈 Проверка прогресса..."
echo ""

docker run --rm -i postgres:15 psql "$DB_URL" <<EOF
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
WHERE cp."userId" = '$USER_ID'
ORDER BY cp."updatedAt" DESC
LIMIT 20;
EOF

echo ""
echo "📋 Проверка логов сбросов..."
echo ""

docker run --rm -i postgres:15 psql "$DB_URL" <<EOF
SELECT 
    al.action,
    al."actorId",
    al."metadata",
    al."createdAt"
FROM "ActivityLog" al
WHERE al.action = 'admin.progress.reset'
AND (al."metadata"->>'userId')::text = '$USER_ID'
ORDER BY al."createdAt" DESC;
EOF

echo ""
echo "✅ Проверка завершена"

