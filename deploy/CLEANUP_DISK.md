# Очистка диска на сервере

## Текущая ситуация:
- **Диск**: 76GB из 96GB использовано (80%)
- **Docker Build Cache**: 68.63GB (можно освободить 9.5GB)
- **Docker Images**: 62.23GB (95 образов, используется только 5)
- **Staging директория**: все еще существует (2.5M)

## Команды для очистки:

### 1. Очистить Docker Build Cache (освободит ~9.5GB)
```bash
docker builder prune -a -f
```

### 2. Удалить неиспользуемые Docker образы (освободит ~5.5GB)
```bash
docker image prune -a -f
```

### 3. Удалить staging директорию (если она не нужна)
```bash
cd /opt/murmur
rm -rf staging
```

### 4. Полная очистка Docker (осторожно!)
```bash
# Удалит все неиспользуемые контейнеры, сети, образы и build cache
docker system prune -a --volumes -f
```

### 5. Проверить размер volumes
```bash
# Проверить реальный размер volumes
docker volume inspect deploy_backend_uploads | grep Mountpoint
du -sh $(docker volume inspect deploy_backend_uploads | grep -oP '(?<="Mountpoint": ")[^"]*')
```

### 6. Проверить размер загруженных файлов в контейнере
```bash
docker exec deploy-backend-1 du -sh /uploads 2>/dev/null || echo "Контейнер не запущен"
```

## Рекомендуемый порядок очистки:

1. **Сначала безопасная очистка:**
```bash
# Очистить build cache
docker builder prune -a -f

# Удалить неиспользуемые образы
docker image prune -a -f

# Проверить результат
df -h /
docker system df
```

2. **Если нужно больше места, удалить staging:**
```bash
cd /opt/murmur
rm -rf staging
df -h /
```

3. **Если все еще мало места, полная очистка Docker:**
```bash
# ВНИМАНИЕ: Это удалит все неиспользуемые ресурсы Docker
docker system prune -a --volumes -f
```

## После очистки проверить:
```bash
df -h /
docker system df
```


