#!/bin/bash

# Help152FZ — Первоначальная настройка VPS
# Ubuntu 24.04 + Hestia Panel
# Запустить ОДИН раз при первом деплое на сервер

set -e

APP_DIR="/var/www/help152fz.ru"
APP_NAME="help152fz"
DOMAIN="help152fz.ru"
NODE_VERSION="20"

echo "============================================"
echo "   Help152FZ — Настройка VPS-сервера"
echo "============================================"
echo ""

# 1. Проверка Node.js
echo "1. Проверка Node.js..."
if ! command -v node &> /dev/null; then
  echo "   Установка Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "   Node.js $(node -v)"
echo "   npm $(npm -v)"

# 2. Установка PM2
echo ""
echo "2. Установка PM2..."
if ! command -v pm2 &> /dev/null; then
  sudo npm install -g pm2
  pm2 startup systemd -u $(whoami) --hp $(eval echo ~$(whoami))
fi
echo "   PM2 $(pm2 -v)"

# 3. Установка PostgreSQL (если нет)
echo ""
echo "3. Проверка PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "   Установка PostgreSQL..."
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
fi
echo "   PostgreSQL $(psql --version | head -1)"

# 4. Создание БД и пользователя
echo ""
echo "4. Настройка базы данных..."
echo "   Создание пользователя и БД..."
sudo -u postgres psql -c "CREATE USER help152fz_user WITH PASSWORD 'H3lp152Fz2026sec';" 2>/dev/null || echo "   Пользователь уже существует"
sudo -u postgres psql -c "CREATE DATABASE help152fz OWNER help152fz_user;" 2>/dev/null || echo "   БД уже существует"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz_user;" 2>/dev/null || true

# 5. Клонирование репозитория
echo ""
echo "5. Подготовка директории приложения..."
sudo mkdir -p $APP_DIR
sudo chown -R $(whoami):$(whoami) $APP_DIR

if [ ! -d "$APP_DIR/.git" ]; then
  echo "   ВНИМАНИЕ: Склонируйте репозиторий вручную:"
  echo "   git clone https://github.com/ВАШ_ЮЗЕРНЕЙМ/help152fz.git $APP_DIR"
  echo ""
  echo "   Или скопируйте код с Replit:"
  echo "   rsync -avz --exclude=node_modules --exclude=.git . user@ВАШ_VPS:$APP_DIR/"
  echo ""
  read -p "   Нажмите Enter после клонирования репозитория..."
fi

cd $APP_DIR

# 6. Создание файла .env
echo ""
echo "6. Создание файла окружения .env..."
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENVFILE'
# === Help152FZ Environment Variables ===
NODE_ENV=production
PORT=5000

# --- База данных ---
DATABASE_URL=postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz

# --- Безопасность ---
# Сгенерируйте свой секрет: openssl rand -hex 32
SESSION_SECRET=ЗАМЕНИТЕ_НА_СВОЙ_СЕКРЕТНЫЙ_КЛЮЧ

# --- Пароль администратора (по умолчанию) ---
ADMIN_PASSWORD=admin123

# --- AI Провайдеры (опционально, можно настроить из админки) ---
# GIGACHATAPIKEY=ваш_ключ_gigachat
# OPENAIAPIKEY=ваш_ключ_openai
# YANDEX_IAM_TOKEN=ваш_токен_yandex

# --- Яндекс GPT (для ИИ-консультанта, опционально) ---
# CONSULTATION_YANDEX_API_KEY=ваш_ключ
# CONSULTATION_YANDEX_FOLDER_ID=ваш_folder_id
# CONSULTATION_GIGACHAT_API_KEY=ваш_ключ
# CONSULTATION_OPENAI_API_KEY=ваш_ключ

# --- ФНС API (опционально) ---
# API_FNS_KEY=ваш_ключ_фнс
ENVFILE

  echo "   Файл .env создан: $APP_DIR/.env"
  echo "   ВАЖНО: Отредактируйте SESSION_SECRET и другие ключи!"
  echo ""
  
  # Генерируем SESSION_SECRET автоматически
  SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | head -c 64)
  sed -i "s/ЗАМЕНИТЕ_НА_СВОЙ_СЕКРЕТНЫЙ_КЛЮЧ/$SECRET/" "$APP_DIR/.env"
  echo "   SESSION_SECRET сгенерирован автоматически"
else
  echo "   Файл .env уже существует, пропускаем"
fi

# 7. Установка зависимостей и сборка
echo ""
echo "7. Установка зависимостей..."
npm install --production=false

echo ""
echo "8. Сборка приложения..."
npm run build

# 8. Миграция БД
echo ""
echo "9. Применение схемы базы данных..."
echo "   ВАЖНО: Если появится вопрос о truncate — ВСЕГДА выбирайте 'No'!"
# Загружаем переменные из .env
set -a; source .env; set +a
npm run db:push || echo "   DB push пропущен"

# 9. Запуск через PM2
echo ""
echo "10. Запуск приложения через PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start dist/index.cjs --name $APP_NAME --env production
pm2 save

# 10. Настройка Nginx (для Hestia Panel)
echo ""
echo "11. Настройка Nginx..."
NGINX_CONF="/etc/nginx/conf.d/domains/${DOMAIN}.conf"
NGINX_CUSTOM="/home/admin/conf/web/${DOMAIN}/nginx.conf_custom"

echo "   Если вы используете Hestia Panel, добавьте в шаблон Nginx:"
echo ""
cat << 'NGINX_TEMPLATE'
# === Добавить в секцию server для help152fz.ru ===
# Файл: /home/admin/conf/web/help152fz.ru/nginx.conf_custom
# Или через Hestia: Web → help152fz.ru → Edit → Nginx Template → Custom

location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}

location /api/ {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
NGINX_TEMPLATE

echo ""
echo "============================================"
echo "   Настройка завершена!"
echo "============================================"
echo ""
echo "Проверка:"
echo "  pm2 status                          — статус приложения"
echo "  pm2 logs $APP_NAME --lines 30       — последние логи"
echo "  curl -s http://localhost:5000        — проверка HTTP"
echo "  curl -s https://$DOMAIN             — проверка HTTPS"
echo ""
echo "Управление:"
echo "  pm2 restart $APP_NAME               — перезапуск"
echo "  pm2 stop $APP_NAME                  — остановка"
echo "  pm2 delete $APP_NAME                — удаление"
echo ""
echo "Обновление кода:"
echo "  cd $APP_DIR && bash deploy.sh        — автодеплой"
echo ""
echo "Админка: https://$DOMAIN/admin"
echo "  Логин: superadmin / superadmin123"
echo "  Логин: admin / admin123"
echo ""
echo "ВАЖНО: Смените пароли после первого входа!"
