# Диагностика проблемы с отображением курсов на сербском языке

## Проблема
Курсы не отображаются, когда выбран сербский язык, хотя курсы с языком SR существуют в базе данных.

## Анализ кодов языков

### База данных (PostgreSQL)
- **Enum**: `CourseLanguage` со значениями `SR` и `RU` (верхний регистр)
- **Хранение**: Enum значения как строки `'SR'` или `'RU'` в базе данных
- **По умолчанию**: `SR` (если не указан)

### Backend API
- **Тип**: `CourseLanguage` enum из Prisma
- **Сериализация**: Prisma автоматически сериализует enum как строку `"SR"` или `"RU"` в JSON
- **Эндпоинт**: `GET /catalog` возвращает все опубликованные курсы

### Frontend
- **Язык пользователя**: `"sr"` или `"ru"` (нижний регистр)
- **Нормализация**: `"sr"` → `"SR"`, `"ru"` → `"RU"`
- **Сравнение**: `course.language === normalizedLanguage` (должно быть `"SR" === "SR"`)

## Возможные причины проблемы

### 1. Несоответствие типов данных
**Проблема**: `course.language` может быть не строкой, а enum объектом

**Решение**: Улучшена нормализация языка в фильтре курсов

### 2. Отсутствие опубликованных курсов с языком SR
**Проверка**: Выполните SQL запрос:
```sql
SELECT COUNT(*) FROM "Course" WHERE language = 'SR' AND "isPublished" = true;
```

### 3. Проблема с сериализацией enum
**Проверка**: Проверьте, что API возвращает язык как строку, а не объект

## Диагностические шаги

### Шаг 1: Проверка данных в базе
Выполните SQL скрипт `diagnose-course-language.sql`:
```bash
psql $DATABASE_URL -f diagnose-course-language.sql
```

### Шаг 2: Проверка API ответа
Откройте Network tab в браузере и проверьте ответ от `/catalog`:
- Какой формат у поля `language`?
- Есть ли курсы с `language: "SR"`?

### Шаг 3: Проверка логов в консоли
После деплоя проверьте логи в консоли браузера:
- `[CatalogService] Loaded courses` - что возвращает API
- `[HomePage filter course]` - почему каждый курс проходит/не проходит фильтрацию
- `[HomePage filter]` - общая статистика фильтрации

### Шаг 4: Проверка языка пользователя
В консоли браузера проверьте:
```javascript
localStorage.getItem('murmur_preferred_language')
// Должно быть "sr" для сербского
```

## Исправления

### 1. Улучшена нормализация языка курса
```typescript
let courseLang: string;
if (!course.language) {
  courseLang = "SR";
} else if (typeof course.language === 'string') {
  courseLang = course.language.toUpperCase().trim();
} else {
  courseLang = String(course.language).toUpperCase().trim();
}
```

### 2. Добавлено детальное логирование
- Логирование на бэкенде (CatalogService)
- Логирование на фронтенде (фильтрация курсов)
- Показывает тип данных и сравнение

### 3. Добавлен fallback на сербские курсы
Если нет курсов на языке пользователя, показываются сербские курсы

## SQL скрипты

### Проверка курсов
```sql
-- Все курсы с их языками
SELECT id, slug, title, language, "isPublished" 
FROM "Course" 
ORDER BY "createdAt" DESC;

-- Подсчет по языкам
SELECT language, COUNT(*) as total, 
       COUNT(*) FILTER (WHERE "isPublished" = true) as published
FROM "Course"
GROUP BY language;
```

### Исправление NULL языков (если нужно)
```sql
UPDATE "Course"
SET language = 'SR'
WHERE language IS NULL;
```

## Следующие шаги

1. Выполните SQL диагностику на сервере
2. Проверьте логи в консоли браузера после деплоя
3. Пришлите результаты диагностики для дальнейшего анализа

