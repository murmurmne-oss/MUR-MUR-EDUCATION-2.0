# Проверка прогресса через backend контейнер

База данных внешняя, поэтому подключаемся через backend контейнер.

## Способ 1: Использовать готовый скрипт

```bash
cd /opt/murmur/deploy
chmod +x check-progress.sh
./check-progress.sh
```

Скрипт запросит User ID и покажет все данные.

## Способ 2: Ручной запрос через backend

### Шаг 1: Узнать User ID
Откройте мини-приложение в браузере → DevTools (F12) → Console:
```javascript
window.Telegram?.WebApp?.initDataUnsafe?.user?.id
```

### Шаг 2: Выполнить SQL запросы

```bash
cd /opt/murmur/deploy

# Замените USER_ID на реальный ID
USER_ID="ваш_user_id"

# 1. Проверка enrollment
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

# 2. Проверка прогресса
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

# 3. Проверка логов сбросов
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
```

## Способ 3: Интерактивный psql через backend

```bash
cd /opt/murmur/deploy

# Подключиться к базе через backend
docker compose -f docker-compose.prod.yml exec backend sh -c 'psql "$DATABASE_URL"'
```

Затем выполните SQL запросы (замените USER_ID):

```sql
-- Проверка enrollment
SELECT 
    ce.id,
    ce."userId",
    ce."courseId",
    ce.status,
    c.title as course_title,
    c.slug as course_slug
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = 'USER_ID';

-- Проверка прогресса
SELECT 
    cp.status,
    cp."progressPercent",
    cp."completedAt",
    l.title as lesson_title,
    c.title as course_title
FROM "CourseProgress" cp
JOIN "Lesson" l ON cp."lessonId" = l.id
JOIN "CourseModule" m ON l."moduleId" = m.id
JOIN "Course" c ON m."courseId" = c.id
WHERE cp."userId" = 'USER_ID'
ORDER BY cp."updatedAt" DESC;

-- Проверка логов
SELECT * FROM "ActivityLog" 
WHERE action = 'admin.progress.reset' 
AND "metadata"->>'userId' = 'USER_ID'
ORDER BY "createdAt" DESC;
```

## Что делать дальше?

1. **Если enrollment есть, но прогресса нет** → прогресс был удален
2. **Если есть логи сброса** → кто-то сбросил через админ-панель
3. **Если данных нет** → пользователь не записан на курс

Для восстановления см. `DIAGNOSE_PROGRESS_RESET.md`

