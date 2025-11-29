#!/bin/bash
# Скрипт для сборки строки подключения к БД из отдельных параметров

echo "🔧 Сборка строки подключения к базе данных"
echo ""
echo "Введите параметры подключения:"
echo ""

read -p "Host (хост сервера БД): " db_host
read -p "Port (порт, обычно 5432) [5432]: " db_port
db_port=${db_port:-5432}

read -p "Database name (имя базы данных): " db_name
read -p "Username (имя пользователя): " db_user
read -sp "Password (пароль): " db_password
echo ""

# Если пароль содержит специальные символы, нужно URL-кодировать
# Но для .env файла обычно можно использовать как есть

# Собираем строку подключения
db_url="postgresql://${db_user}:${db_password}@${db_host}:${db_port}/${db_name}"

echo ""
echo "✅ Строка подключения:"
echo ""
echo "$db_url"
echo ""

# Сохраняем в файл для копирования
echo "$db_url" > /tmp/database_url.txt
echo "📋 Строка также сохранена в /tmp/database_url.txt"
echo ""

# Предлагаем добавить в .env.staging
if [ -f .env.staging ]; then
    read -p "Добавить в .env.staging? (yes/no): " add_to_env
    if [ "$add_to_env" = "yes" ]; then
        if grep -q "^DATABASE_URL_STAGING=" .env.staging; then
            sed -i "s|^DATABASE_URL_STAGING=.*|DATABASE_URL_STAGING=$db_url|" .env.staging
            echo "✅ Обновлено в .env.staging"
        else
            echo "DATABASE_URL_STAGING=$db_url" >> .env.staging
            echo "✅ Добавлено в .env.staging"
        fi
    fi
else
    echo "⚠️  Файл .env.staging не найден"
    echo "   Создайте его и добавьте строку:"
    echo "   DATABASE_URL_STAGING=$db_url"
fi

echo ""
echo "📝 Скопируйте строку выше и добавьте в .env.staging:"
echo "   DATABASE_URL_STAGING=$db_url"

