# Настройка бота для открытия WebApp в полноэкранном режиме

Чтобы приложение открывалось в полноэкранном режиме по умолчанию, нужно настроить бота через BotFather.

## Способ 1: Настройка через BotFather (рекомендуется)

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/setmenubutton`
3. Выберите вашего бота
4. Отправьте URL вашего WebApp (например: `https://mini.murmurmne.com`)
5. BotFather спросит о начальном состоянии. Выберите **"Expanded"** (развернуто)

Или используйте команду напрямую:
```
/setmenubutton
@your_bot_username
https://mini.murmurmne.com
Expanded
```

## Способ 2: Настройка через Bot API (если кнопки создаются программно)

Если вы создаете WebApp кнопки программно через Bot API, используйте параметр `initial_state: "expanded"`:

```json
{
  "text": "Открыть приложение",
  "web_app": {
    "url": "https://mini.murmurmne.com",
    "initial_state": "expanded"
  }
}
```

Пример для InlineKeyboardButton:
```typescript
{
  text: "Открыть приложение",
  web_app: {
    url: "https://mini.murmurmne.com",
    initial_state: "expanded"
  }
}
```

## Способ 3: Настройка Menu Button через Bot API

Вы также можете установить меню-кнопку программно:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_button": {
      "type": "web_app",
      "text": "Открыть приложение",
      "web_app": {
        "url": "https://mini.murmurmne.com",
        "initial_state": "expanded"
      }
    }
  }'
```

## Проверка

После настройки:
1. Откройте бота в Telegram
2. Нажмите на кнопку меню (три линии внизу)
3. Откройте WebApp
4. Приложение должно открыться сразу в полноэкранном режиме

## Примечание

Даже если бот настроен на открытие в compact режиме, код приложения автоматически вызовет `expand()` для перехода в полноэкранный режим. Однако настройка бота на `initial_state: "expanded"` обеспечит открытие в полноэкранном режиме сразу, без задержки.

