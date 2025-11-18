#!/bin/bash

# Скрипт проверки безопасности приложения
# Использование: export API_KEY="your-key" && ./check-security.sh

API_KEY="${API_KEY:-}"
API_BASE="${API_BASE:-https://api.murmurmne.com}"

echo "🔒 Проверка безопасности приложения"
echo "======================================"
echo ""

# Проверка 1: API_KEY установлен
if [ -z "$API_KEY" ]; then
    echo "❌ API_KEY не установлен в переменных окружения"
    echo "   Установите: export API_KEY=your-key"
    echo "   Или передайте: API_KEY=your-key ./check-security.sh"
    exit 1
else
    echo "✅ API_KEY установлен (длина: ${#API_KEY} символов)"
    if [ ${#API_KEY} -lt 32 ]; then
        echo "   ⚠️  Предупреждение: API ключ должен быть минимум 32 символа"
    fi
fi

# Проверка 2: Защищенные endpoints требуют ключ
echo ""
echo "🔐 Проверка защиты endpoints..."

# Тест создания курса без ключа
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/courses" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}')

if [ "$RESPONSE" = "401" ]; then
    echo "✅ POST /courses защищен (401 без ключа)"
else
    echo "❌ POST /courses НЕ защищен! Вернул: $RESPONSE (ожидалось 401)"
fi

# Тест удаления без ключа
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_BASE/courses/test")
if [ "$RESPONSE" = "401" ]; then
    echo "✅ DELETE /courses защищен (401 без ключа)"
else
    echo "❌ DELETE /courses НЕ защищен! Вернул: $RESPONSE (ожидалось 401)"
fi

# Тест получения пользователей без ключа
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/users")
if [ "$RESPONSE" = "401" ]; then
    echo "✅ GET /users защищен (401 без ключа)"
else
    echo "❌ GET /users НЕ защищен! Вернул: $RESPONSE (ожидалось 401)"
fi

# Тест загрузки файлов без ключа
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/uploads/images" \
  -F "file=@/dev/null" 2>/dev/null)
if [ "$RESPONSE" = "401" ]; then
    echo "✅ POST /uploads/images защищен (401 без ключа)"
else
    echo "❌ POST /uploads/images НЕ защищен! Вернул: $RESPONSE (ожидалось 401)"
fi

# Тест аналитики без ключа
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/analytics/overview")
if [ "$RESPONSE" = "401" ]; then
    echo "✅ GET /analytics/overview защищен (401 без ключа)"
else
    echo "❌ GET /analytics/overview НЕ защищен! Вернул: $RESPONSE (ожидалось 401)"
fi

# Проверка 3: Публичные endpoints доступны
echo ""
echo "🌐 Проверка публичных endpoints..."

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/courses")
if [ "$RESPONSE" = "200" ]; then
    echo "✅ GET /courses доступен публично (200)"
else
    echo "⚠️  GET /courses вернул: $RESPONSE (ожидалось 200)"
fi

# Проверка 4: Endpoints работают с ключом
echo ""
echo "🔑 Проверка доступа с API ключом..."

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/users" \
  -H "X-API-Key: $API_KEY")
if [ "$RESPONSE" = "200" ]; then
    echo "✅ GET /users работает с API ключом (200)"
else
    echo "❌ GET /users НЕ работает с ключом! Вернул: $RESPONSE (ожидалось 200)"
    echo "   Проверьте, что API_KEY в .env совпадает с тем, что передаете"
fi

# Проверка 5: Проверка сообщения об ошибке
echo ""
echo "📝 Проверка сообщений об ошибках..."

ERROR_MSG=$(curl -s -X POST "$API_BASE/courses" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}' | grep -o '"message":"[^"]*"')

if echo "$ERROR_MSG" | grep -q "API ключ"; then
    echo "✅ Сообщение об ошибке корректное"
else
    echo "⚠️  Сообщение об ошибке: $ERROR_MSG"
fi

echo ""
echo "======================================"
echo "✅ Проверка завершена"
echo ""
echo "💡 Совет: Запустите проверку регулярно для мониторинга безопасности"

