#!/bin/bash
# help152fz.ru — Скрипт первоначальной настройки VPS
# VPS: 77.222.37.120
# Запускать один раз на чистом сервере
set -e

echo "=== help152fz.ru VPS Setup ==="
echo ""

# 1. Установка необходимого ПО (если ещё не установлено)
echo "[1/8] Проверка и установка зависимостей..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

# 2. Настройка PostgreSQL
echo "[2/8] Настройка базы данных PostgreSQL..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='help152fz'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE USER help152fz WITH PASSWORD 'Help152fz2024';"
    echo "  Пользователь help152fz создан"
}

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='help152fz'" | grep -q 1 || {
    sudo -u postgres psql -c "CREATE DATABASE help152fz OWNER help152fz;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz;"
    echo "  База данных help152fz создана"
}

# 3. Создание директории проекта
echo "[3/8] Создание директории проекта..."
mkdir -p /var/www/help152fz.ru
cd /var/www/help152fz.ru

# 4. Клонирование репозитория
echo "[4/8] Клонирование репозитория..."
if [ ! -d ".git" ]; then
    git clone https://github.com/sae230679-del/securelex-ru.git .
    git config --global --add safe.directory /var/www/help152fz.ru
fi

# 5. Установка зависимостей
echo "[5/8] Установка npm зависимостей..."
npm install --production=false

# 6. Копирование конфигурации
echo "[6/8] Копирование конфигурации..."
if [ -f "help152fz/ecosystem.config.cjs" ]; then
    cp help152fz/ecosystem.config.cjs ecosystem.config.cjs
fi

if [ ! -f ".env" ]; then
    cp help152fz/.env.template .env
    echo "  ВАЖНО: Отредактируйте /var/www/help152fz.ru/.env!"
    echo "  Особенно: SESSION_SECRET, TELEGRAM_BOT_TOKEN"
fi

# 7. Сборка проекта
echo "[7/9] Сборка проекта..."
npm run build

# 8. Миграция базы данных
echo "[8/9] Применение схемы базы данных..."
npx drizzle-kit push --force

# 9. Запуск через PM2
echo "[9/9] Запуск через PM2..."
pm2 delete help152fz 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup 2>/dev/null || true

# 9. Настройка SSL (если certbot доступен)
echo ""
echo "=== Настройка завершена! ==="
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте /var/www/help152fz.ru/.env"
echo "   - Сгенерируйте SESSION_SECRET: openssl rand -hex 32"
echo "   - Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID"
echo "2. Настройте Nginx:"
echo "   - Скопируйте help152fz/nginx-help152fz.conf в Hestia"
echo "   - Или: cp help152fz/nginx-help152fz.conf /etc/nginx/conf.d/"
echo "3. Настройте SSL:"
echo "   - certbot --nginx -d help152fz.ru -d www.help152fz.ru"
echo "4. Перезапустите: pm2 restart help152fz"
echo "5. Войдите как SuperAdmin: sae230679@yandex.ru"
echo "6. Настройте через админку:"
echo "   - ЮКасса (Платежи)"
echo "   - SMTP (Почта)"
echo "   - OAuth (Яндекс ID, ВК ID)"
echo "   - Реферальная программа"
echo "   - DaData (ИНН)"
