# Команды для деплоя miniapp

## Быстрый деплой (после git pull)

```bash
cd /opt/murmur/deploy
git pull
docker compose -f docker-compose.prod.yml build miniapp
docker compose -f docker-compose.prod.yml up -d miniapp
```

## Проверка статуса

```bash
# Проверить, что контейнер запущен
docker ps | grep miniapp

# Проверить логи
docker logs $(docker ps -q -f name=miniapp) --tail 50

# Проверить, что приложение отвечает
curl -I https://mini.murmurmne.com
```

## Полный перезапуск (если что-то пошло не так)

```bash
cd /opt/murmur/deploy
docker compose -f docker-compose.prod.yml stop miniapp
docker compose -f docker-compose.prod.yml rm -f miniapp
docker compose -f docker-compose.prod.yml build --no-cache miniapp
docker compose -f docker-compose.prod.yml up -d miniapp
```

