# Исправление check-progress-simple.sh на сервере

Если git pull не работает из-за конфликтов, выполните:

```bash
cd /opt/murmur/deploy

# Вариант 1: Сбросить локальные изменения
git stash
git pull
git stash pop  # если нужно сохранить изменения

# Вариант 2: Принудительно обновить файл
git checkout -- deploy/check-progress-simple.sh
git pull

# Вариант 3: Вручную обновить файл (если выше не помогло)
# Скопируйте содержимое из репозитория или выполните:
git fetch origin
git reset --hard origin/main
```

После обновления выполните:
```bash
./check-progress-simple.sh 446207374
```

