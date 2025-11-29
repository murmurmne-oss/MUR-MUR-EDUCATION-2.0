#!/bin/bash
# Скрипт для деплоя production окружения
# ВНИМАНИЕ: Используйте только после тестирования на staging!

set -e

echo "🚀 Deploying to PRODUCTION..."
echo "⚠️  WARNING: This will update the live application!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

cd "$(dirname "$0")"

# Проверяем наличие .env
if [ ! -f .env ]; then
    echo "❌ Error: .env not found!"
    exit 1
fi

# Обновляем код
echo "📥 Pulling latest changes..."
git pull origin main

# Собираем образы
echo "🔨 Building images..."
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache

# Останавливаем старые контейнеры
echo "🛑 Stopping old containers..."
docker compose -f docker-compose.prod.yml --env-file .env down

# Запускаем новые контейнеры
echo "▶️  Starting new containers..."
docker compose -f docker-compose.prod.yml --env-file .env up -d

# Показываем статус
echo "📊 Container status:"
docker compose -f docker-compose.prod.yml --env-file .env ps

echo "✅ Production deployment complete!"
echo "📝 Check logs with: docker compose -f docker-compose.prod.yml logs -f"

