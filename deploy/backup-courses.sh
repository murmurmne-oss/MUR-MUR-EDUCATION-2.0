#!/bin/bash
# Скрипт для резервного копирования курсов на сервере

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-courses.js"
BACKUP_DIR="$SCRIPT_DIR/backups"

echo "📦 Резервное копирование курсов"
echo "================================"
echo ""

# Проверяем, что скрипт существует
if [ ! -f "$BACKUP_SCRIPT" ]; then
  echo "❌ Скрипт backup-courses.js не найден: $BACKUP_SCRIPT"
  exit 1
fi

# Копируем скрипт в контейнер backend
echo "📋 Копирую скрипт в контейнер backend..."
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" cp "$BACKUP_SCRIPT" backend:/app/backup-courses.js

# Создаем директорию для бэкапов на хосте, если её нет
mkdir -p "$BACKUP_DIR"

# Запускаем бэкап в контейнере
echo "🔄 Запускаю резервное копирование..."
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" exec -T backend node /app/backup-courses.js

# Копируем бэкап из контейнера на хост
echo "📥 Копирую бэкап из контейнера..."
# Находим последний созданный бэкап (исключая latest симлинк)
LATEST_BACKUP=$(docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" exec -T backend sh -c 'ls -t /app/backups/courses-backup-*.json 2>/dev/null | grep -v latest | head -1' | tr -d '\r\n' || echo "")

if [ -n "$LATEST_BACKUP" ]; then
  BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
  docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" cp "backend:$LATEST_BACKUP" "$BACKUP_DIR/$BACKUP_FILENAME"
  echo "✅ Бэкап сохранен: $BACKUP_DIR/$BACKUP_FILENAME"
  
  # Создаем симлинк на последний бэкап на хосте
  LATEST_LINK="$BACKUP_DIR/courses-backup-latest.json"
  if [ -L "$LATEST_LINK" ] || [ -f "$LATEST_LINK" ]; then
    rm -f "$LATEST_LINK"
  fi
  ln -s "$BACKUP_FILENAME" "$LATEST_LINK"
  echo "🔗 Создан симлинк: $LATEST_LINK -> $BACKUP_FILENAME"
else
  echo "⚠️  Не удалось найти созданный бэкап"
  echo "   Проверьте логи выше для диагностики"
fi

echo ""
echo "✅ Готово! Бэкапы находятся в: $BACKUP_DIR"
echo ""

