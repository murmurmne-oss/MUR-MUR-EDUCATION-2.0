#!/bin/bash
# Скрипт для восстановления курсов из резервной копии на сервере

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTORE_SCRIPT="$SCRIPT_DIR/restore-courses.js"
BACKUP_FILE="$1"

# Если путь относительный, делаем его абсолютным относительно SCRIPT_DIR
if [ -n "$BACKUP_FILE" ] && [[ "$BACKUP_FILE" != /* ]]; then
  BACKUP_FILE="$SCRIPT_DIR/$BACKUP_FILE"
fi

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Использование: $0 <путь-к-бэкапу> [--dry-run] [--skip-existing]"
  echo ""
  echo "Примеры:"
  echo "  $0 backups/courses-backup-2024-01-15T10-30-00.json"
  echo "  $0 backups/courses-backup-latest.json --dry-run"
  echo "  $0 backups/courses-backup-latest.json --skip-existing"
  exit 1
fi

# Проверяем, что файл существует
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Файл бэкапа не найден: $BACKUP_FILE"
  exit 1
fi

# Проверяем, что скрипт существует
if [ ! -f "$RESTORE_SCRIPT" ]; then
  echo "❌ Скрипт restore-courses.js не найден: $RESTORE_SCRIPT"
  exit 1
fi

echo "🔄 Восстановление курсов из бэкапа"
echo "=================================="
echo ""
echo "📁 Файл бэкапа: $BACKUP_FILE"
echo ""

# Показываем дополнительные опции
DRY_RUN=""
SKIP_EXISTING=""
if [[ "$*" == *"--dry-run"* ]]; then
  DRY_RUN="--dry-run"
  echo "⚠️  РЕЖИМ ПРОВЕРКИ: изменения не будут применены"
fi
if [[ "$*" == *"--skip-existing"* ]]; then
  SKIP_EXISTING="--skip-existing"
  echo "⏭️  Существующие курсы будут пропущены"
fi
echo ""

# Запрашиваем подтверждение, если не dry-run
if [ -z "$DRY_RUN" ]; then
  read -p "⚠️  ВНИМАНИЕ: Это восстановит курсы из бэкапа. Продолжить? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Отменено пользователем"
    exit 1
  fi
fi

# Копируем скрипт и файл бэкапа в контейнер backend
echo "📋 Копирую скрипт и файл бэкапа в контейнер backend..."
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" cp "$RESTORE_SCRIPT" backend:/app/restore-courses.js
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" cp "$BACKUP_FILE" backend:/app/backup-to-restore.json

# Запускаем восстановление в контейнере
echo "🔄 Запускаю восстановление..."
docker compose -f "$SCRIPT_DIR/docker-compose.prod.yml" exec -T backend node /app/restore-courses.js /app/backup-to-restore.json $DRY_RUN $SKIP_EXISTING

echo ""
echo "✅ Готово!"

