# Проверка и восстановление Production

## Быстрая диагностика

```bash
# 1. Проверьте статус production контейнеров
cd /opt/murmur/deploy
docker compose -f docker-compose.prod.yml ps

# 2. Проверьте логи на ошибки
docker compose -f docker-compose.prod.yml logs --tail=50

# 3. Проверьте, какие контейнеры запущены
docker ps

# 4. Проверьте, какие контейнеры остановлены
docker ps -a | grep -E "Exited|Stopped"
```

## Восстановление Production

```bash
cd /opt/murmur/deploy

# 1. Запустите все production контейнеры
docker compose -f docker-compose.prod.yml up -d

# 2. Проверьте статус
docker compose -f docker-compose.prod.yml ps

# 3. Проверьте логи
docker compose -f docker-compose.prod.yml logs --tail=30
```

## Если контейнеры не запускаются

```bash
# Проверьте логи конкретного сервиса
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs admin
docker compose -f docker-compose.prod.yml logs miniapp
docker compose -f docker-compose.prod.yml logs caddy

# Перезапустите конкретный сервис
docker compose -f docker-compose.prod.yml restart backend
docker compose -f docker-compose.prod.yml restart admin
docker compose -f docker-compose.prod.yml restart miniapp
docker compose -f docker-compose.prod.yml restart caddy
```

