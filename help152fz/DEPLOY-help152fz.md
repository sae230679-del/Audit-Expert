# help152fz.ru — Деплой и конфигурация сервера

**ЭТОТ ФАЙЛ — ЕДИНЫЙ СПРАВОЧНИК ПО ДЕПЛОЮ И СЕРВЕРУ help152fz.ru**

---

## VPS Сервер (Production)

| Параметр | Значение |
|----------|----------|
| IP-адрес | 77.222.37.120 |
| SSH пользователь | root |
| SSH порт | 22 |
| SSH пароль | SY59VMU9Cx2LSA6% |
| Домен | help152fz.ru |
| Hestia Panel | https://77.222.37.120:8083 |
| Hestia логин (admin) | admin / Que8shee2aa1oz |
| Hestia логин (hestiaadmin) | hestiaadmin / JYR*^LIfxdhbHETEA% |
| ОС | Ubuntu (Hestia CP) |

---

## Приложение на сервере

| Параметр | Значение |
|----------|----------|
| Путь к проекту | /var/www/help152fz.ru |
| PM2 имя процесса | help152fz |
| PM2 конфиг | ecosystem.config.cjs |
| Порт приложения | 5000 |
| GitHub репозиторий | sae230679-del/securelex-ru (тот же код) |
| Файл запуска | dist/index.cjs |

---

## База данных

```
Host: localhost:5432
Database: help152fz
User: help152fz
Password: Help152fz2024
DATABASE_URL: postgresql://help152fz:Help152fz2024@localhost:5432/help152fz
```

---

## Переменные окружения на VPS (.env)

Файл: `/var/www/help152fz.ru/.env`
- NODE_ENV=production
- PORT=5000
- DOMAIN=https://help152fz.ru
- SITE_URL=https://help152fz.ru
- DATABASE_URL=postgresql://help152fz:Help152fz2024@localhost:5432/help152fz
- SESSION_SECRET=сгенерировать: `openssl rand -hex 32`
- TELEGRAM_BOT_TOKEN=...
- TELEGRAM_CHAT_ID=...
- SUPERADMIN_EMAIL=sae230679@yandex.ru
- MASTER_ADMIN_EMAIL=sae230679@yandex.ru

---

## Первоначальная установка

### 1. Подключиться к серверу
```bash
ssh root@77.222.37.120
# Пароль: SY59VMU9Cx2LSA6%
```

### 2. Установить Node.js 20, PM2, PostgreSQL (если нет)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib git
npm install -g pm2
```

### 3. Создать базу данных
```bash
sudo -u postgres psql
CREATE USER help152fz WITH PASSWORD 'Help152fz2024';
CREATE DATABASE help152fz OWNER help152fz;
GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz;
\q
```

### 4. Клонировать и настроить проект
```bash
mkdir -p /var/www/help152fz.ru
cd /var/www/help152fz.ru
git clone https://github.com/sae230679-del/securelex-ru.git .
git config --global --add safe.directory /var/www/help152fz.ru

# Копировать конфиг PM2 из папки help152fz
cp help152fz/ecosystem.config.cjs ecosystem.config.cjs

# Создать .env из шаблона
cp help152fz/.env.template .env
nano .env  # Заполнить SESSION_SECRET и другие значения

# Установить зависимости и собрать
npm install --production=false
npm run build

# Применить схему БД
npx drizzle-kit push --force

# Запустить
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Настроить Nginx через Hestia
В Hestia Panel (https://77.222.37.120:8083):
1. Добавить домен help152fz.ru
2. Включить SSL (Let's Encrypt)
3. В настройках Nginx (Custom Templates или Advanced) добавить proxy_pass:

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

### 6. SSL сертификат (если не через Hestia)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d help152fz.ru -d www.help152fz.ru
```

---

## Команда деплоя (из Replit или локально)

```bash
# Подключиться к серверу
sshpass -p "SY59VMU9Cx2LSA6%" ssh -o StrictHostKeyChecking=no root@77.222.37.120

# Полный редеплой (одна команда)
cd /var/www/help152fz.ru && git pull origin main && npm install && npm run build && npx drizzle-kit push --force && cp -r dist/public/* /home/admin/web/help152fz.ru/public_html/ 2>/dev/null; pm2 restart help152fz
```

---

## Полезные команды на сервере

```bash
pm2 status                      # Статус всех процессов
pm2 logs help152fz               # Логи в реальном времени
pm2 logs help152fz --lines 50    # Последние 50 строк
pm2 restart help152fz            # Перезапуск
pm2 show help152fz               # Подробная информация
pm2 save                         # Сохранить конфигурацию

cd /var/www/help152fz.ru         # Перейти в проект
cat .env                         # Посмотреть переменные окружения
npm run build                    # Пересобрать проект
npx drizzle-kit push --force     # Применить миграции БД
```

---

## SSH-команды из Replit

```bash
# Проверить логи
sshpass -p "SY59VMU9Cx2LSA6%" ssh -o StrictHostKeyChecking=no root@77.222.37.120 "pm2 logs help152fz --lines 30 --nostream"

# Перезапустить
sshpass -p "SY59VMU9Cx2LSA6%" ssh -o StrictHostKeyChecking=no root@77.222.37.120 "pm2 restart help152fz"

# Статус
sshpass -p "SY59VMU9Cx2LSA6%" ssh -o StrictHostKeyChecking=no root@77.222.37.120 "pm2 status"
```

---

## Структура файлов на VPS

```
/var/www/help152fz.ru/           # Код приложения
├── dist/
│   ├── index.cjs                # Скомпилированный сервер
│   └── public/                  # Скомпилированный фронтенд
│       ├── assets/              # JS, CSS файлы
│       └── index.html
├── ecosystem.config.cjs         # PM2 конфигурация
├── .env                         # Переменные окружения
└── package.json

/home/admin/web/help152fz.ru/
├── public_html/                 # Nginx отдаёт статику отсюда!
│   └── assets/                  # КОПИРОВАТЬ сюда после сборки!
└── ...
```

---

## Настройки через админку (SuperAdmin)

После первого запуска войдите как SuperAdmin (sae230679@yandex.ru) и настройте:

### 1. ЮКасса (Платежи)
- SuperAdmin > Настройки > Платежи
- Shop ID: из личного кабинета ЮКасса
- Secret Key: из личного кабинета ЮКасса
- Webhook URL: `https://help152fz.ru/api/payments/webhook`
- Return URL: `https://help152fz.ru/payment-result` (формируется автоматически кодом)

### 2. Почта (SMTP)
- SuperAdmin > Настройки > Почта
- SMTP хост: smtp-сервер вашего домена
- SMTP порт: 465 (SSL) или 587 (TLS)
- Email: support@help152fz.ru (или другой)
- Пароль: пароль от почтового ящика
- От кого: help152fz.ru

### 3. OAuth (Яндекс ID + ВК ID)
- SuperAdmin > Настройки > OAuth
- Яндекс: Client ID + Client Secret из Яндекс OAuth
- ВК: App ID + Secret Key из VK ID
- Callback URL Яндекс: `https://help152fz.ru/api/oauth/yandex/callback`
- Callback URL ВК: `https://help152fz.ru/api/oauth/vk/callback`

### 4. Реферальная программа
- SuperAdmin > Реферальная программа
- Скопировать все настройки с securelex.ru:
  - Режимы: самозанятые, ИП, ООО
  - Процент вознаграждения
  - Система проверки и одобрения
  - Связка с ЮКасса для выплат

### 5. DaData (ИНН)
- SuperAdmin > Настройки > Интеграции
- API-ключ DaData
- Secret DaData

---

## Чеклист деплоя нового функционала

```
[ ] npm run build — без ошибок
[ ] Проверить что новые system_settings имеют дефолтные значения
[ ] npx drizzle-kit push --force на VPS (если менялась схема)
[ ] cp -r dist/public/* /home/admin/web/help152fz.ru/public_html/
[ ] pm2 restart help152fz
[ ] Проверить pm2 logs help152fz --lines 50 — нет ошибок
[ ] Очистить кэш браузера и проверить UI
[ ] Проверить SuperAdmin — все новые настройки доступны
```

---

## Известные ошибки и решения

### 1. Пустой экран после деплоя (404 для .js/.css)
**Причина**: Hestia Nginx перехватывает статические запросы
**Решение**: `cp -r /var/www/help152fz.ru/dist/public/* /home/admin/web/help152fz.ru/public_html/`

### 2. Git ownership error
**Решение**: `git config --global --add safe.directory /var/www/help152fz.ru`

### 3. PM2 не видит переменные окружения
**Решение**: Переменные должны быть в ecosystem.config.cjs И в .env файле

### 4. DOMAIN mismatch
**Важно**: Убедитесь что DOMAIN=https://help152fz.ru (не securelex.ru!) в .env и ecosystem.config.cjs
