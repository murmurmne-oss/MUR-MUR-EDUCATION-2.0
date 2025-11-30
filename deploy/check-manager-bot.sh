#!/bin/bash

echo "=== Проверка бота-менеджера ==="
echo ""

# Проверка статуса контейнера backend
echo "1. Статус контейнера backend:"
docker ps --filter "name=deploy-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Проверка переменных окружения
echo "2. Проверка переменных окружения (из .env):"
cd /opt/murmur/deploy || exit 1
if [ -f .env ]; then
  echo "MANAGER_BOT_TOKEN: $(grep -E '^MANAGER_BOT_TOKEN=' .env | cut -d'=' -f2 | head -c 20)..."
  echo "MANAGER_CHAT_ID: $(grep -E '^MANAGER_CHAT_ID=' .env | cut -d'=' -f2)"
  echo "MANAGER_BOT_SECRET_TOKEN: $(grep -E '^MANAGER_BOT_SECRET_TOKEN=' .env | cut -d'=' -f2 | head -c 10)..."
else
  echo "⚠️  Файл .env не найден!"
fi
echo ""

# Проверка логов backend на ошибки
echo "3. Последние 50 строк логов backend (ищем ошибки):"
docker logs deploy-backend-1 --tail 50 2>&1 | grep -i -E "(error|warn|manager|support-bot|webhook)" || echo "Нет ошибок в логах"
echo ""

# Проверка доступности webhook endpoint
echo "4. Проверка доступности webhook endpoint:"
WEBHOOK_URL="https://api.murmurmne.com/support-bot/webhook"
echo "URL: $WEBHOOK_URL"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$WEBHOOK_URL" -X POST -H "Content-Type: application/json" -d '{}' || echo "⚠️  Не удалось подключиться"
echo ""

# Проверка webhook в Telegram API
echo "5. Проверка настроенного webhook в Telegram:"
if [ -f .env ]; then
  BOT_TOKEN=$(grep -E '^MANAGER_BOT_TOKEN=' .env | cut -d'=' -f2)
  if [ -n "$BOT_TOKEN" ]; then
    echo "Запрос к Telegram API..."
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | python3 -m json.tool 2>/dev/null || curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
  else
    echo "⚠️  MANAGER_BOT_TOKEN не найден в .env"
  fi
else
  echo "⚠️  Файл .env не найден"
fi
echo ""

# Проверка, что модуль зарегистрирован
echo "6. Проверка регистрации модуля SupportBotModule:"
docker exec deploy-backend-1 sh -c "grep -r 'SupportBotModule' /app/dist 2>/dev/null | head -5" || echo "⚠️  Модуль не найден в собранном коде"
echo ""

echo "=== Диагностика завершена ==="
echo ""
echo "Если webhook не настроен, выполните:"
echo "curl -X POST \"https://api.telegram.org/bot\${MANAGER_BOT_TOKEN}/setWebhook\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"url\": \"https://api.murmurmne.com/support-bot/webhook\", \"secret_token\": \"\${MANAGER_BOT_SECRET_TOKEN}\"}'"

