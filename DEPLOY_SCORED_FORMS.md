# Деплой новой функциональности SCORED форм

## Что было добавлено:
- Новый тип формы `SCORED` с баллами за варианты ответов
- UI в админ-панели для создания SCORED форм
- Логика расчета баллов и определения результатов

## Команды для деплоя на сервере:

```bash
# 1. Перейти в директорию деплоя
cd /opt/murmur/deploy

# 2. Получить последние изменения из репозитория
git pull origin main

# 3. Пересобрать backend (важно: изменилась схема Prisma)
docker compose -f docker-compose.prod.yml build --no-cache backend

# 4. Пересобрать admin (изменился UI для форм)
docker compose -f docker-compose.prod.yml build --no-cache admin

# 5. Перезапустить сервисы
docker compose -f docker-compose.prod.yml up -d backend admin
```

## Или одной командой:

```bash
cd /opt/murmur/deploy && git pull origin main && docker compose -f docker-compose.prod.yml build --no-cache backend admin && docker compose -f docker-compose.prod.yml up -d backend admin
```

## Что произойдет:

1. **Backend** автоматически применит миграцию базы данных при старте (команда `npx prisma migrate deploy` в docker-compose)
2. Миграция добавит значение `SCORED` в enum `FormType`
3. Backend будет использовать новую логику расчета баллов
4. Admin получит новый UI для создания SCORED форм

## Проверка после деплоя:

1. Проверьте логи backend:
   ```bash
   docker compose -f docker-compose.prod.yml logs backend
   ```
   Должна быть строка о применении миграции

2. Откройте админ-панель и создайте новую форму
3. Выберите тип формы "С баллами (SCORED)"
4. Убедитесь, что можно добавлять варианты ответов с баллами

## Важно:

- Миграция базы данных применяется автоматически при старте backend
- Если миграция не применилась, можно применить вручную:
  ```bash
  docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
  ```

