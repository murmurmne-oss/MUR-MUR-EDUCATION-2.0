#!/bin/bash
# Прямая проверка прогресса - выполните на сервере

# ЗАМЕНИТЕ 'USER_ID' на реальный ID пользователя
USER_ID="USER_ID"

echo "🔍 Проверка enrollment для пользователя $USER_ID..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "psql \"\$DATABASE_URL\" -c \"
SELECT 
    ce.id,
    ce.\"userId\",
    ce.\"courseId\",
    ce.status,
    c.title as course_title,
    c.slug as course_slug
FROM \"CourseEnrollment\" ce
JOIN \"Course\" c ON ce.\"courseId\" = c.id
WHERE ce.\"userId\" = '$USER_ID';
\""

echo ""
echo "📈 Проверка прогресса..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "psql \"\$DATABASE_URL\" -c \"
SELECT 
    cp.status,
    cp.\"progressPercent\",
    cp.\"completedAt\",
    l.title as lesson_title,
    c.title as course_title
FROM \"CourseProgress\" cp
JOIN \"Lesson\" l ON cp.\"lessonId\" = l.id
JOIN \"CourseModule\" m ON l.\"moduleId\" = m.id
JOIN \"Course\" c ON m.\"courseId\" = c.id
WHERE cp.\"userId\" = '$USER_ID'
ORDER BY cp.\"updatedAt\" DESC
LIMIT 20;
\""

echo ""
echo "📋 Проверка логов сбросов..."
docker compose -f docker-compose.prod.yml exec -T backend sh -c "psql \"\$DATABASE_URL\" -c \"
SELECT 
    al.action,
    al.\"actorId\",
    al.\"metadata\",
    al.\"createdAt\"
FROM \"ActivityLog\" al
WHERE al.action = 'admin.progress.reset'
AND (al.\"metadata\"->>'userId')::text = '$USER_ID'
ORDER BY al.\"createdAt\" DESC;
\""

