#!/bin/bash

echo "=== Настройка webhook для бота-менеджера ==="
echo ""

cd /opt/murmur/deploy || exit 1

if [ ! -f .env ]; then
  echo "⚠️  Файл .env не найден!"
  exit 1
fi

# Читаем переменные из .env
MANAGER_BOT_TOKEN=$(grep -E '^MANAGER_BOT_TOKEN=' .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
MANAGER_BOT_SECRET_TOKEN=$(grep -E '^MANAGER_BOT_SECRET_TOKEN=' .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$MANAGER_BOT_TOKEN" ]; then
  echo "⚠️  MANAGER_BOT_TOKEN не найден в .env"
  exit 1
fi

WEBHOOK_URL="https://api.murmurmne.com/support-bot/webhook"

echo "Токен бота: ${MANAGER_BOT_TOKEN:0:20}..."
echo "URL webhook: $WEBHOOK_URL"
echo ""

# Проверяем текущий webhook
echo "Текущий webhook:"
curl -s "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/getWebhookInfo"
echo ""
echo ""

# Устанавливаем новый webhook
echo "Установка webhook..."
if [ -n "$MANAGER_BOT_SECRET_TOKEN" ]; then
  echo "С секретным токеном..."
  RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\", \"secret_token\": \"${MANAGER_BOT_SECRET_TOKEN}\"}")
else
  echo "Без секретного токена..."
  RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WEBHOOK_URL}\"}")
fi

echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
echo ""

# Проверяем результат
echo "Проверка установленного webhook:"
curl -s "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot${MANAGER_BOT_TOKEN}/getWebhookInfo"
echo ""

echo "=== Готово ==="

