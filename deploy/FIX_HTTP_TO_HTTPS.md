# Инструкция по обновлению URL с http:// на https://

Этот скрипт обновляет все URL с `http://api.murmurmne.com` на `https://api.murmurmne.com` в базе данных.

## Что обновляется:

1. **Прямые URL поля:**
   - `Course.coverImageUrl` - обложки курсов
   - `Course.promoVideoUrl` - промо видео курсов
   - `Lesson.videoUrl` - видео уроков
   - `LessonAttachment.url` - URL вложений к урокам
   - `User.avatarUrl` - аватары пользователей

2. **JSON поля:**
   - `Lesson.content` - контент уроков (блоки с изображениями, видео, аудио)
   - `CourseTest.questions` - вопросы тестов
   - `CourseForm.questions` и `results` - вопросы и результаты форм
   - `FormAttempt.responses` - ответы на формы
   - `TestAttempt.responses` - ответы на тесты
   - `ActivityLog.metadata` - метаданные логов активности

## Как выполнить:

### Вариант 1: Через psql (рекомендуется)

```bash
# Подключитесь к базе данных
psql $DATABASE_URL

# Выполните скрипт
\i fix-http-to-https-urls.sql

# Или напрямую:
psql $DATABASE_URL -f fix-http-to-https-urls.sql
```

### Вариант 2: Через Docker контейнер

```bash
# Найдите контейнер с базой данных или backend контейнер
docker exec -i <backend-container> psql $DATABASE_URL < fix-http-to-https-urls.sql
```

### Вариант 3: Через Prisma Studio или другой клиент

Скопируйте содержимое файла `fix-http-to-https-urls.sql` и выполните в вашем SQL клиенте.

## Проверка результатов:

После выполнения скрипта выполните эти запросы для проверки:

```sql
-- Проверка курсов
SELECT COUNT(*) as courses_with_http 
FROM "Course" 
WHERE "coverImageUrl" LIKE 'http://api.murmurmne.com%' 
   OR "promoVideoUrl" LIKE 'http://api.murmurmne.com%';

-- Проверка уроков
SELECT COUNT(*) as lessons_with_http 
FROM "Lesson" 
WHERE "videoUrl" LIKE 'http://api.murmurmne.com%' 
   OR ("content"::text LIKE '%http://api.murmurmne.com%');

-- Проверка вложений
SELECT COUNT(*) as attachments_with_http 
FROM "LessonAttachment" 
WHERE "url" LIKE 'http://api.murmurmne.com%';
```

Все запросы должны вернуть `0`, если обновление прошло успешно.

## Важно:

- Скрипт использует транзакцию (`BEGIN`/`COMMIT`), поэтому если что-то пойдет не так, все изменения будут отменены
- Рекомендуется сделать резервную копию базы данных перед выполнением скрипта
- Скрипт обновляет только URL с `http://api.murmurmne.com`, другие домены не затрагиваются

