#!/bin/bash
# Скрипт для поиска User ID по username или имени

echo "🔍 Поиск User ID по username или имени"
echo ""
echo "Введите username (без @) или имя пользователя:"
read SEARCH_TERM

if [ -z "$SEARCH_TERM" ]; then
    echo "❌ Поисковый запрос не может быть пустым"
    exit 1
fi

echo ""
echo "📊 Поиск пользователя '$SEARCH_TERM'..."
echo ""

docker compose -f docker-compose.prod.yml exec -T backend sh -c "psql \"\$DATABASE_URL\" -c \"
SELECT 
    id,
    \"firstName\",
    \"lastName\",
    username,
    \"languageCode\",
    \"createdAt\"
FROM \"User\"
WHERE 
    username ILIKE '%$SEARCH_TERM%' 
    OR \"firstName\" ILIKE '%$SEARCH_TERM%'
    OR \"lastName\" ILIKE '%$SEARCH_TERM%'
    OR CONCAT(\"firstName\", ' ', \"lastName\") ILIKE '%$SEARCH_TERM%'
ORDER BY \"createdAt\" DESC
LIMIT 10;
\""

echo ""
echo "✅ Если пользователь найден, используйте значение из колонки 'id' как User ID"

