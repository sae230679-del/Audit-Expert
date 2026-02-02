#!/bin/bash

# Help152FZ Auto Deploy Script
# Запускать на VPS после git push из Replit

set -e

APP_DIR="/var/www/help152fz.ru"
PUBLIC_HTML="/home/admin/web/help152fz.ru/public_html"
APP_NAME="help152fz"

echo "=== Help152FZ Deploy ==="
echo "$(date)"

cd $APP_DIR

echo "1. Pulling latest code..."
git pull origin main

echo "2. Installing dependencies..."
npm install --production=false

echo "3. Building application..."
npm run build

echo "4. Copying static files..."
cp -r dist/public/* $PUBLIC_HTML/

echo "5. Running database migrations..."
npm run db:push || echo "DB push skipped or failed"

echo "6. Restarting application..."
pm2 restart $APP_NAME

echo "7. Checking status..."
pm2 status $APP_NAME

echo ""
echo "=== Deploy complete! ==="
echo "Check logs: pm2 logs $APP_NAME --lines 20"
