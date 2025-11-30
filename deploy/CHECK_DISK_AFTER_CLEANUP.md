# Проверка диска после очистки

## Выполнено:
1. ✅ Удалена staging директория
2. ✅ Очищен Docker Build Cache (68.63GB)

## Следующие шаги:

### 1. Проверить текущее состояние диска
```bash
df -h /
docker system df
```

### 2. Удалить неиспользуемые Docker образы (освободит ~5.5GB)
```bash
docker image prune -a -f
```

### 3. Проверить результат
```bash
df -h /
docker system df
```

### 4. Если нужно больше места - полная очистка Docker
```bash
# ВНИМАНИЕ: Удалит все неиспользуемые ресурсы
docker system prune -a --volumes -f
```


