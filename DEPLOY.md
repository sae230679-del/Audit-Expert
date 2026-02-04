# Help152FZ - Инструкция по деплою на VPS

## Требования
- Ubuntu 22.04/24.04
- Node.js 20+
- PostgreSQL 15+
- Nginx
- PM2

## 1. Подготовка сервера

```bash
# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Установка PM2
sudo npm install -g pm2

# Установка PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

## 2. Создание базы данных

```bash
sudo -u postgres psql

CREATE DATABASE help152fz;
CREATE USER help152fz WITH ENCRYPTED PASSWORD 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz;
\q
```

## 3. Клонирование проекта

```bash
cd /var/www
git clone https://github.com/YOUR_REPO/help152fz.git help152fz.ru
cd help152fz.ru

# Добавить safe.directory
git config --global --add safe.directory /var/www/help152fz.ru
```

## 4. Настройка переменных окружения

```bash
# Редактировать ecosystem.config.cjs
nano ecosystem.config.cjs

# Заполнить:
# - DATABASE_URL
# - SESSION_SECRET (openssl rand -hex 32)
# - YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY
# - TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID
```

## 5. Установка и сборка

```bash
npm install
npm run build
npm run db:push
```

## 6. Копирование статики (ВАЖНО!)

```bash
# Nginx (Hestia) ищет статику в public_html
cp -r dist/public/* /home/admin/web/help152fz.ru/public_html/
```

## 7. Запуск приложения

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 8. Настройка Nginx

В `/home/admin/conf/web/help152fz.ru/nginx.ssl.conf`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

```bash
nginx -t && systemctl reload nginx
```

## 9. SSL сертификат

Через Hestia Control Panel:
1. Web → выбрать домен → Edit
2. SSL → Let's Encrypt → Save

## Команда полного редеплоя

```bash
cd /var/www/help152fz.ru && git pull origin main && npm install && npm run build && cp -r dist/public/* /home/admin/web/help152fz.ru/public_html/ && pm2 restart help152fz
```

## Проверка

```bash
# Статус PM2
pm2 status

# Логи
pm2 logs help152fz --lines 50

# Проверка ответа
curl -I http://127.0.0.1:3001
```

## Тестовые аккаунты

После первого запуска автоматически создаются:
- superadmin / superadmin123 (суперадмин)
- admin / admin123 (админ)
- user / user123 (пользователь)

---

## Установка с Hestia Control Panel

### Этап 1: Установка Hestia

```bash
# Скачать установщик
wget https://raw.githubusercontent.com/hestiacp/hestiacp/release/install/hst-install.sh

# Запустить установку (интерактивный режим)
bash hst-install.sh

# После установки - перезагрузить сервер
reboot
```

### Этап 2: Вход в панель Hestia

```
URL: https://77.222.37.120:8083
Логин: admin
Пароль: (указан при установке)
```

### Этап 3: Добавление домена

1. **WEB** → **Add Web Domain**
2. Указать: `help152fz.ru`
3. Включить: **Mail Support**
4. Включить: **DNS Support** (если DNS на этом сервере)
5. Сохранить

### Этап 4: Создание почтовых ящиков

1. **MAIL** → выбрать `help152fz.ru`
2. **Add Mail Account**
3. Создать ящики:
   - `info@help152fz.ru`
   - `support@help152fz.ru`
   - `noreply@help152fz.ru`

### Этап 5: DNS записи для почты

В панели регистратора домена добавить:

```
MX     @           mail.help152fz.ru    10
A      mail        77.222.37.120
TXT    @           v=spf1 a mx ip4:77.222.37.120 ~all
TXT    _dmarc      v=DMARC1; p=none; rua=mailto:admin@help152fz.ru
```

DKIM запись — скопировать из Hestia (MAIL → домен → DKIM)

### Этап 6: Восстановление сайта после установки Hestia

```bash
# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установить PM2
npm install -g pm2

# Восстановить БД (если был бэкап)
sudo -u postgres psql -c "CREATE USER help152fz WITH PASSWORD 'Help152FZ2025';"
sudo -u postgres psql -c "CREATE DATABASE help152fz OWNER help152fz;"
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz < /root/backup_before_hestia/database.sql

# Перейти в директорию сайта Hestia
cd /home/admin/web/help152fz.ru/public_html

# Клонировать репозиторий
git clone https://github.com/sae230679-del/Audit-Expert .

# Установить зависимости и собрать
npm install
npm run build

# Создать .env файл
nano .env

# Запустить через PM2
pm2 start npm --name "help152fz" -- start
pm2 save
pm2 startup
```

### Этап 7: Настройка Nginx в Hestia

Отредактировать `/home/admin/conf/web/help152fz.ru/nginx.ssl.conf`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

```bash
nginx -t && systemctl reload nginx
```

---

## Важные предупреждения

⚠️ **Порт 25**: Некоторые VPS (OVH, DigitalOcean, Vultr) блокируют порт 25 по умолчанию. Без него почта не будет отправляться — нужно писать в поддержку хостинга.

⚠️ **SSL для почты**: В Hestia → MAIL → домен → включить SSL

⚠️ **Путь к сайту в Hestia**: `/home/admin/web/help152fz.ru/public_html/` (не `/var/www/`)
