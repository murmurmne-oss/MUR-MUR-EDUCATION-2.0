# Исправление языка скопированного курса

## Проблема
Курс был создан путем копирования русского курса. Хотя язык был изменен в админке после копирования, курс не отображается в приложении, потому что язык не был правильно сохранен в базе данных.

## Решение

### Вариант 1: Исправление через SQL (быстрое решение)

1. Найдите slug курса в админке (например, `eros-everyday-srb`)

2. Выполните SQL запрос на сервере через Prisma:
```bash
cd /opt/murmur/deploy
docker exec -i $(docker ps -q -f name=backend) sh -c "
  cd /app && \
  npx prisma db execute --stdin <<'SQL'
UPDATE \"Course\"
SET language = 'SR'
WHERE slug = 'eros-everyday-srb';
SELECT id, slug, title, language, \"isPublished\" FROM \"Course\" WHERE slug = 'eros-everyday-srb';
SQL
"
```

**Или используйте готовый скрипт:**
```bash
cd /opt/murmur/deploy
chmod +x fix-course-language-command.sh
./fix-course-language-command.sh eros-everyday-srb SR
```

3. Проверьте, что язык обновился:
```bash
docker exec -i $(docker ps -q -f name=backend) sh -c "
  cd /app && \
  npx prisma db execute --stdin <<'SQL'
SELECT id, slug, title, language, \"isPublished\" 
FROM \"Course\" 
WHERE slug = 'eros-everyday-srb';
SQL
"
```

### Вариант 2: Исправление через админку (с логированием)

1. Откройте консоль браузера (F12) в админке

2. Откройте курс для редактирования

3. Измените язык на нужный (SR или RU)

4. Сохраните курс

5. Проверьте логи в консоли:
   - `[CourseForm.handleSubmit]` - что отправляется в API
   - Должно быть `payloadLanguage: "SR"` или `"RU"`

6. Проверьте логи backend контейнера:
```bash
docker logs $(docker ps -q -f name=backend) | grep "CoursesService.update"
```
   - Должно показать, что язык обновляется

### Вариант 3: Массовое исправление всех скопированных курсов

Если у вас много скопированных курсов с неправильным языком:

```sql
-- Обновить все курсы с '-copy-' в slug на сербский язык
UPDATE "Course"
SET language = 'SR'
WHERE slug LIKE '%-copy-%'
  AND language = 'RU';
```

## Проверка результата

После исправления:

1. Проверьте в базе данных:
```sql
SELECT id, slug, title, language, "isPublished"
FROM "Course"
WHERE slug = 'your-course-slug-here';
```

2. Проверьте в приложении:
   - Откройте приложение с сербским языком
   - Курс должен отображаться в списке

3. Проверьте логи фильтрации (в консоли браузера F12):
   - `[HomePage filter course]` - должен показывать `matches: true` для курса
   - `[HomePage filter]` - должен показывать курс в `filteredCourses`

## Предотвращение проблемы в будущем

Проблема была в том, что при копировании курса язык копируется правильно, но при последующем редактировании может не сохраняться. 

Добавлено логирование для диагностики:
- **Frontend (админка)**: Логирует payload перед отправкой
- **Backend**: Логирует входящие данные при обновлении курса

Если проблема повторится, проверьте логи, чтобы увидеть, что именно отправляется и принимается.

## SQL скрипты

Используйте `fix-course-language.sql` для детальной диагностики и исправления.

