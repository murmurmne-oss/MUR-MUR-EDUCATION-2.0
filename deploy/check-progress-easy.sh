#!/bin/bash
# Простая проверка прогресса - использует готовый JS файл

USER_ID="${1:-}"

if [ -z "$USER_ID" ]; then
    echo "❌ Укажите User ID"
    echo "Использование: ./check-progress-easy.sh <USER_ID>"
    exit 1
fi

echo "🔍 Проверка прогресса для пользователя: $USER_ID"
echo ""

# Копируем JS файл в рабочую директорию backend и выполняем
docker compose -f docker-compose.prod.yml cp check-progress.js backend:/app/check-progress.js
docker compose -f docker-compose.prod.yml exec -T backend sh -c "cd /app && node check-progress.js $USER_ID"

