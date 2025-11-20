# Инструкция по развертыванию системы форм

## Шаг 1: PowerShell (локально) - Коммит и пуш изменений

```powershell
# Перейти в корневую директорию проекта
cd G:\tg-miniapp-bot

# Проверить статус изменений
git status

# Добавить все измененные файлы
git add .

# Закоммитить изменения
git commit -m "feat: добавлена система форм с результатами на основе выбора вариантов

- Добавлена модель CourseForm в Prisma schema
- Реализованы API endpoints для работы с формами
- Добавлен UI в админ панели для создания/редактирования форм
- Реализована логика подсчета результатов на основе категорий (A, B, C, D)"

# Запушить изменения на сервер
git push origin main
```

## Шаг 2: На сервере (SSH) - Обновление и применение миграции

```bash
# Подключиться к серверу (если еще не подключены)
ssh ваш_пользователь@ваш_сервер

# Перейти в директорию проекта
cd /opt/murmur/deploy

# Обновить код из репозитория
git pull origin main

# Перейти в директорию backend для создания миграции
cd ../apps/backend

# Создать миграцию базы данных
npx prisma migrate dev --name add_course_forms

# Или если база недоступна напрямую, создать миграцию вручную:
# npx prisma migrate dev --name add_course_forms --create-only
# Затем применить миграцию через docker exec

# Вернуться в директорию deploy
cd /opt/murmur/deploy

# Пересобрать backend контейнер
docker compose -f docker-compose.prod.yml build backend

# Пересобрать admin контейнер
docker compose -f docker-compose.prod.yml build admin

# Перезапустить контейнеры
docker compose -f docker-compose.prod.yml up -d backend admin

# Проверить логи backend
docker compose -f docker-compose.prod.yml logs -f backend

# Проверить логи admin
docker compose -f docker-compose.prod.yml logs -f admin
```

## Альтернативный способ: Применение миграции через Docker

Если миграция не была применена автоматически:

```bash
# Применить миграцию через контейнер backend
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Или если нужно создать миграцию вручную:
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate dev --name add_course_forms
```

## Проверка работы

1. **Проверить админ панель:**
   - Открыть `https://admin.murmurmne.com`
   - Войти в систему
   - Открыть любой курс для редактирования
   - Проверить наличие новой секции "Формы"
   - Попробовать создать форму с вопросами и результатами

2. **Проверить API:**
   ```bash
   # Проверить, что формы возвращаются в API
   curl https://api.murmurmne.com/courses/ваш-курс-slug
   ```

3. **Проверить базу данных:**
   ```bash
   # Подключиться к базе данных через контейнер
   docker compose -f docker-compose.prod.yml exec backend npx prisma studio
   # Или проверить через psql
   docker compose -f docker-compose.prod.yml exec backend npx prisma db execute --stdin
   ```

## Откат изменений (если что-то пошло не так)

```bash
# Откатить миграцию
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate resolve --rolled-back add_course_forms

# Или откатить git изменения
cd /opt/murmur/deploy
git reset --hard HEAD~1
git pull origin main
docker compose -f docker-compose.prod.yml build backend admin
docker compose -f docker-compose.prod.yml up -d backend admin
```

## Примечания

- Убедитесь, что переменные окружения `DATABASE_URL` правильно настроены
- Если возникают ошибки при создании миграции, проверьте подключение к базе данных
- После применения миграции рекомендуется сделать резервную копию базы данных

