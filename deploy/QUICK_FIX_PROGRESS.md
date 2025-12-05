# Быстрая диагностика сброса прогресса

## Что нужно сделать СЕЙЧАС:

### 1. Узнать User ID пользователя
```bash
# В браузере откройте DevTools (F12) → Console и выполните:
window.Telegram?.WebApp?.initDataUnsafe?.user?.id
```

### 2. Проверить базу данных на сервере

База данных внешняя, подключаемся через backend контейнер:

```bash
cd /opt/murmur/deploy

# Интерактивный режим
docker compose -f docker-compose.prod.yml exec backend sh -c 'psql "$DATABASE_URL"'
```

Или используйте готовый скрипт:
```bash
cd /opt/murmur/deploy
chmod +x check-progress.sh
./check-progress.sh
```

### 3. Выполните эти SQL запросы (замените USER_ID):

```sql
-- Проверка enrollment
SELECT ce.*, c.title, c.slug 
FROM "CourseEnrollment" ce
JOIN "Course" c ON ce."courseId" = c.id
WHERE ce."userId" = 'USER_ID';

-- Проверка прогресса
SELECT cp.*, l.title as lesson, c.title as course
FROM "CourseProgress" cp
JOIN "Lesson" l ON cp."lessonId" = l.id
JOIN "CourseModule" m ON l."moduleId" = m.id
JOIN "Course" c ON m."courseId" = c.id
WHERE cp."userId" = 'USER_ID';

-- Проверка логов сбросов
SELECT * FROM "ActivityLog" 
WHERE action = 'admin.progress.reset' 
AND "metadata"->>'userId' = 'USER_ID';
```

### 4. Результаты:

- **Если данных нет** → прогресс был удален (CASCADE или ручной сброс)
- **Если данные есть** → проблема на фронтенде (неправильный userId)
- **Если есть логи сброса** → кто-то сбросил через админ-панель

### 5. Если нужно восстановить:

См. файл `DIAGNOSE_PROGRESS_RESET.md` для детальных инструкций.

