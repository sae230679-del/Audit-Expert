#!/bin/bash

# Help152FZ Auto Deploy Script
# Запускать на VPS после git push из Replit

set -e

APP_DIR="/var/www/help152fz.ru"
PUBLIC_HTML="/home/admin/web/help152fz.ru/public_html"
APP_NAME="help152fz"
BACKUP_DIR="/var/www/help152fz.ru/backups"

echo "=== Help152FZ Deploy ==="
echo "$(date)"

cd $APP_DIR

echo "1. Создание бэкапа БД перед деплоем..."
mkdir -p $BACKUP_DIR
BACKUP_FILE="$BACKUP_DIR/pre_deploy_$(date +%Y%m%d_%H%M%S).sql"
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null && echo "   Бэкап сохранён: $BACKUP_FILE" || echo "   ВНИМАНИЕ: Бэкап не удался, продолжаем..."
else
  echo "   DATABASE_URL не задан, бэкап пропущен"
fi

echo "2. Обновление кода с GitHub..."
git stash 2>/dev/null || true
git pull origin main
git stash pop 2>/dev/null || true

echo "3. Установка зависимостей..."
npm install --production=false

echo "4. Сборка приложения..."
npm run build

echo "5. Копирование статических файлов..."
cp -r dist/public/* $PUBLIC_HTML/ 2>/dev/null || true

echo "6. Миграция базы данных..."
echo "   ВАЖНО: Если появится вопрос о truncate — ВСЕГДА выбирайте 'No'!"
npm run db:push || echo "   DB push пропущен или завершился с ошибкой"

echo "7. Перезапуск приложения..."
pm2 restart $APP_NAME 2>/dev/null || pm2 start dist/index.cjs --name $APP_NAME

echo "8. Проверка статуса..."
pm2 status $APP_NAME

echo "9. Удаление старых бэкапов (старше 7 дней)..."
find $BACKUP_DIR -name "pre_deploy_*.sql" -mtime +7 -delete 2>/dev/null || true

echo ""
echo "=== Деплой завершён! ==="
echo "Проверить логи: pm2 logs $APP_NAME --lines 20"
echo "Проверить сайт: curl -s -o /dev/null -w '%{http_code}' http://localhost:5000"
