# Help152FZ — Команды для VPS

## Первый деплой (одноразово)

```bash
# 1. Подключиться к серверу
ssh root@ВАШ_IP

# 2. Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. Установить PM2
npm install -g pm2
pm2 startup systemd

# 4. Создать БД PostgreSQL
sudo -u postgres psql -c "CREATE USER help152fz_user WITH PASSWORD 'H3lp152Fz2026sec';"
sudo -u postgres psql -c "CREATE DATABASE help152fz OWNER help152fz_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz_user;"

# 5. Создать директорию и клонировать код
mkdir -p /var/www/help152fz.ru
cd /var/www/help152fz.ru
git clone https://github.com/ВАШ_РЕПО/help152fz.git .

# 6. Создать .env файл
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz
SESSION_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=admin123
EOF

# 7. Установить зависимости
npm install --production=false

# 8. Собрать проект
npm run build

# 9. Применить схему БД
npx drizzle-kit push

# 10. Запустить приложение
pm2 start dist/index.cjs --name help152fz
pm2 save

# 11. Проверить
pm2 status
curl http://localhost:5000
```

## Обновление кода (каждый раз)

```bash
cd /var/www/help152fz.ru
bash deploy.sh
```

Или вручную:

```bash
cd /var/www/help152fz.ru
git pull origin main
npm install --production=false
npm run build
npx drizzle-kit push
pm2 restart help152fz
```

## Nginx (Hestia Panel)

Добавить в /home/admin/conf/web/help152fz.ru/nginx.conf_custom:

```nginx
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
}
```

После изменений:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Полезные команды

```bash
# Логи приложения
pm2 logs help152fz --lines 50

# Статус
pm2 status

# Перезапуск
pm2 restart help152fz

# Остановка
pm2 stop help152fz

# Бэкап БД
pg_dump postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz > backup_$(date +%Y%m%d).sql

# Восстановление БД
psql postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz < backup_файл.sql

# Мониторинг
pm2 monit

# Проверка порта
curl -s -o /dev/null -w '%{http_code}' http://localhost:5000
```

## Переменные окружения (.env)

| Переменная | Обязательна | Описание |
|-----------|:-----------:|---------|
| DATABASE_URL | Да | PostgreSQL строка подключения |
| SESSION_SECRET | Да | Секрет для JWT (openssl rand -hex 32) |
| NODE_ENV | Да | production |
| PORT | Нет | Порт сервера (по умолчанию 5000) |
| ADMIN_PASSWORD | Нет | Пароль админа по умолчанию |
| GIGACHATAPIKEY | Нет | Ключ GigaChat API |
| OPENAIAPIKEY | Нет | Ключ OpenAI API |
| YANDEX_IAM_TOKEN | Нет | IAM-токен Яндекс |
| API_FNS_KEY | Нет | Ключ API ФНС |

## Доступ к админке

- URL: https://help152fz.ru/admin
- Суперадмин: superadmin / superadmin123
- Админ: admin / admin123
- ВАЖНО: Смените пароли после первого входа!
