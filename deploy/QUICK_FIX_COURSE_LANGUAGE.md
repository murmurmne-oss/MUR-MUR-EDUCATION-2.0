# Быстрое исправление языка курса

## Команда для выполнения на сервере:

```bash
cd /opt/murmur/deploy
git pull
docker cp fix-course-language.js $(docker ps -q -f name=backend):/app/
docker exec -i $(docker ps -q -f name=backend) sh -c "cd /app && node fix-course-language.js eros-everyday-srb SR"
```

Замените:
- `eros-everyday-srb` на slug вашего курса
- `SR` на нужный язык (`SR` или `RU`)

## Примеры:

```bash
# Обновить курс на сербский
docker exec -i $(docker ps -q -f name=backend) sh -c "cd /app && node fix-course-language.js eros-everyday-srb SR"

# Обновить курс на русский
docker exec -i $(docker ps -q -f name=backend) sh -c "cd /app && node fix-course-language.js my-course-slug RU"
```

