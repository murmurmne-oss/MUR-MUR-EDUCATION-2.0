# Диагностика бота-менеджера

Если бот-менеджер не пересылает сообщения, выполните следующие шаги:

## 1. Быстрая диагностика

На сервере выполните:

```bash
cd /opt/murmur/deploy
chmod +x check-manager-bot.sh
./check-manager-bot.sh
```

Скрипт проверит:
- Статус контейнера backend
- Наличие переменных окружения
- Логи на ошибки
- Доступность webhook endpoint
- Настройки webhook в Telegram

## 2. Переустановка webhook

Если webhook не настроен или сломался:

```bash
cd /opt/murmur/deploy
chmod +x setup-manager-bot-webhook.sh
./setup-manager-bot-webhook.sh
```

## 3. Ручная проверка

### Проверка контейнера:
```bash
docker ps --filter "name=deploy-backend"
docker logs deploy-backend-1 --tail 100 | grep -i "support-bot\|manager"
```

### Проверка переменных окружения:
```bash
cd /opt/murmur/deploy
grep -E "MANAGER_BOT" .env
```

Должны быть установлены:
- `MANAGER_BOT_TOKEN` - токен бота от @BotFather
- `MANAGER_CHAT_ID` - ID чата/группы, куда пересылаются сообщения
- `MANAGER_BOT_SECRET_TOKEN` - (опционально) секретный токен для защиты webhook

### Проверка webhook в Telegram:
```bash
# Замените YOUR_BOT_TOKEN на токен из .env
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### Ручная установка webhook:
```bash
# Замените YOUR_BOT_TOKEN и YOUR_SECRET_TOKEN на значения из .env
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.murmurmne.com/support-bot/webhook", "secret_token": "YOUR_SECRET_TOKEN"}'
```

## 4. Частые проблемы

### Проблема: Бот не отвечает вообще
**Решение:** Проверьте, что контейнер backend запущен и работает:
```bash
docker ps --filter "name=deploy-backend"
docker logs deploy-backend-1 --tail 50
```

### Проблема: Webhook не настроен
**Решение:** Выполните `setup-manager-bot-webhook.sh` или установите вручную (см. выше)

### Проблема: Переменные окружения не установлены
**Решение:** Добавьте в `/opt/murmur/deploy/.env`:
```
MANAGER_BOT_TOKEN=ваш_токен_от_BotFather
MANAGER_CHAT_ID=ваш_chat_id
MANAGER_BOT_SECRET_TOKEN=ваш_секретный_токен
```

После изменения `.env` перезапустите контейнер:
```bash
cd /opt/murmur/deploy
docker compose -f docker-compose.prod.yml restart backend
```

### Проблема: Бот получает сообщения, но не пересылает
**Решение:** 
1. Проверьте, что `MANAGER_CHAT_ID` указан правильно
2. Убедитесь, что бот добавлен в группу/чат с этим ID
3. Проверьте логи на ошибки:
```bash
docker logs deploy-backend-1 --tail 100 | grep -i error
```

## 5. Как получить MANAGER_CHAT_ID

1. Добавьте бота в группу/чат
2. Отправьте любое сообщение боту
3. Выполните:
```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates"
```
4. Найдите `"chat":{"id":...}` в ответе - это и есть ваш `MANAGER_CHAT_ID`

## 6. Проверка работы

1. Отправьте тестовое сообщение боту-менеджеру
2. Проверьте логи:
```bash
docker logs deploy-backend-1 --tail 20 -f
```
3. Должно появиться сообщение в группе менеджеров (если `MANAGER_CHAT_ID` настроен)

