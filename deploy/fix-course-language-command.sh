#!/bin/bash
# Скрипт для исправления языка курса через Prisma

COURSE_SLUG="${1:-eros-everyday-srb}"
NEW_LANGUAGE="${2:-SR}"

echo "Обновление языка курса: $COURSE_SLUG -> $NEW_LANGUAGE"

docker exec -i $(docker ps -q -f name=backend) sh -c "
  cd /app && \
  npx prisma db execute --stdin <<'SQL'
UPDATE \"Course\"
SET language = '$NEW_LANGUAGE'
WHERE slug = '$COURSE_SLUG';
SELECT id, slug, title, language, \"isPublished\" FROM \"Course\" WHERE slug = '$COURSE_SLUG';
SQL
"

