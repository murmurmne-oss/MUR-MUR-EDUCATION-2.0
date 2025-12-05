#!/bin/bash
# Принудительное обновление check-progress-simple.sh

cd /opt/murmur/deploy

# Удаляем локальный файл
rm -f deploy/check-progress-simple.sh

# Принудительно обновляем из репозитория
git fetch origin
git checkout origin/main -- deploy/check-progress-simple.sh

# Делаем исполняемым
chmod +x deploy/check-progress-simple.sh

echo "✅ Файл обновлен. Теперь выполните:"
echo "./check-progress-simple.sh 446207374"

