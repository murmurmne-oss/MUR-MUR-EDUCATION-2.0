# Очистка Staging окружения на сервере

## Команды для выполнения на сервере

```bash
# 1. Остановите и удалите staging контейнеры
cd /opt/murmur/staging/deploy
docker compose -f docker-compose.staging.yml --env-file .env.staging down 2>/dev/null || true

# 2. Удалите staging контейнеры вручную (если они остались)
docker rm -f staging-backend-1 staging-admin-1 staging-miniapp-1 staging-caddy-1 2>/dev/null || true
docker rm -f deploy-backend-1 deploy-admin-1 deploy-miniapp-1 2>/dev/null || true

# 3. Удалите staging образы (опционально, для освобождения места)
docker rmi murmur-backend:staging murmur-admin:staging murmur-miniapp:staging 2>/dev/null || true

# 4. Удалите staging volumes (опционально)
docker volume rm staging_backend_uploads_staging staging_caddy_data_staging staging_caddy_config_staging 2>/dev/null || true
docker volume rm deploy_backend_uploads_staging deploy_caddy_data_staging deploy_caddy_config_staging 2>/dev/null || true

# 5. Удалите staging сеть (если есть)
docker network rm staging_default 2>/dev/null || true

# 6. Удалите staging директорию (если хотите полностью очистить)
# ВНИМАНИЕ: Это удалит все staging файлы на сервере!
# rm -rf /opt/murmur/staging

# 7. Получите обновления из git (удалят staging файлы из репозитория)
cd /opt/murmur/deploy  # или где у вас основной репозиторий
git pull origin main

# 8. Проверьте, что staging контейнеры удалены
docker ps -a | grep staging
docker ps -a | grep deploy | grep staging

# 9. Проверьте, что production работает нормально
cd /opt/murmur/deploy
docker compose -f docker-compose.prod.yml ps
```

## Быстрая очистка (одной командой)

```bash
# Остановить и удалить все staging контейнеры
docker stop $(docker ps -q --filter "name=staging") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=staging") 2>/dev/null || true

# Удалить staging образы
docker rmi $(docker images | grep staging | awk '{print $3}') 2>/dev/null || true

# Получить обновления
cd /opt/murmur/deploy && git pull origin main
```

## Проверка

После выполнения команд проверьте:

```bash
# Нет staging контейнеров
docker ps -a | grep staging

# Production работает
docker compose -f docker-compose.prod.yml ps

# Нет staging файлов в deploy
ls -la /opt/murmur/deploy/*staging* 2>/dev/null || echo "Staging файлы удалены"
```

## Важно

- ✅ Production не будет затронут
- ✅ Все staging контейнеры будут удалены
- ✅ Staging файлы будут удалены из репозитория
- ⚠️ Если хотите сохранить staging БД `murmur_staging` - не удаляйте её в OVH

