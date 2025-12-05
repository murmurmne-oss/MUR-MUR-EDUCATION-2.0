# Диагностика сброса прогресса курса

## Шаг 1: Определить User ID пользователя

1. Откройте мини-приложение в браузере
2. Откройте DevTools (F12)
3. В консоли выполните:
```javascript
// Проверьте, какой userId используется
console.log('User ID:', window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
```

Или проверьте в Network tab, какой userId отправляется в запросах к API.

## Шаг 2: Проверить данные в базе данных

### Вариант A: Через backend контейнер (рекомендуется)

```bash
cd /opt/murmur/deploy

# Интерактивный режим
docker compose -f docker-compose.prod.yml exec backend sh -c 'psql "$DATABASE_URL"'

# Или используйте готовый скрипт
chmod +x check-progress.sh
./check-progress.sh
```

См. подробную инструкцию: `CHECK_PROGRESS_VIA_BACKEND.md`

### Вариант B: Прямое подключение к базе

```bash
psql -h <host> -U <username> -d <database_name>
```

### Выполните SQL запросы

Замените `'USER_ID'` на реальный ID пользователя из шага 1:

```sql
-- 1. Проверка enrollment
SELECT 
    ce.id,
    ce."userId",
    ce."courseId",
    ce.status,
    c.title as course_title,
    c.slug as course_slug
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = 'USER_ID'
ORDER BY ce."createdAt" DESC;

-- 2. Проверка прогресса
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

-- 3. Проверка логов на сбросы
SELECT 
    al.action,
    al."metadata",
    al."createdAt"
FROM "ActivityLog" al
WHERE al.action = 'admin.progress.reset'
AND (al."metadata"->>'userId')::text = 'USER_ID'
ORDER BY al."createdAt" DESC;
```

## Шаг 3: Анализ результатов

### Если enrollment отсутствует:
- Пользователь не записан на курс
- Нужно заново записаться на курс

### Если enrollment есть, но нет прогресса:
- Прогресс был удален (CASCADE DELETE при удалении урока/курса)
- Или был выполнен ручной сброс через админ-панель
- Проверьте логи ActivityLog

### Если есть записи в ActivityLog с action = 'admin.progress.reset':
- Прогресс был сброшен вручную через админ-панель
- Проверьте, кто и когда это сделал

## Шаг 4: Возможные решения

### Решение 1: Восстановление из бэкапа
Если есть бэкап базы данных, можно восстановить прогресс:
```bash
# Восстановление из бэкапа
pg_restore -h <host> -U <username> -d <database_name> <backup_file>
```

### Решение 2: Ручное восстановление прогресса
Если знаете, какие уроки были пройдены, можно восстановить вручную через SQL:
```sql
-- Пример: отметить урок как завершенный
INSERT INTO "CourseProgress" (
    "userId",
    "lessonId",
    status,
    "progressPercent",
    "startedAt",
    "completedAt",
    "lastViewedAt"
) VALUES (
    'USER_ID',
    'LESSON_ID',
    'COMPLETED',
    100,
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT ("userId", "lessonId") 
DO UPDATE SET 
    status = 'COMPLETED',
    "progressPercent" = 100,
    "completedAt" = NOW(),
    "lastViewedAt" = NOW();
```

### Решение 3: Предотвращение в будущем
1. Регулярные бэкапы базы данных
2. Ограничение доступа к админ-панели
3. Логирование всех действий с прогрессом

## Шаг 5: Проверка на фронтенде

Откройте DevTools → Network tab и проверьте:
1. Запрос к `/users/{userId}/enrollments` - что возвращается?
2. Какой userId используется в запросах?
3. Есть ли ошибки в консоли?

## Контакты для помощи

Если проблема не решена, соберите следующую информацию:
- User ID пользователя
- Результаты SQL запросов
- Скриншоты из DevTools (Network tab)
- Логи из ActivityLog

