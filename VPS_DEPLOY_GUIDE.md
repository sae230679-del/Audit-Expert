# Help152FZ — Полное руководство по VPS-деплою

> **ЕДИНЫЙ СПРАВОЧНИК**: Этот файл заменяет VPS_ERRORS.md, VPS_DEPLOYMENT_ISSUES.md и DEPLOY.md.
> **ЧИТАТЬ ПЕРЕД ЛЮБЫМ ДЕПЛОЕМ!**
> Последнее обновление: 05.02.2026

---

## Содержание

1. [Реквизиты сервера](#реквизиты-сервера)
2. [Подготовка сервера](#1-подготовка-сервера)
3. [SSH доступ и Hestia CP](#2-ssh-доступ-и-hestia-cp)
4. [База данных PostgreSQL](#3-база-данных-postgresql)
5. [Деплой приложения](#4-деплой-приложения)
6. [PM2 — менеджер процессов](#5-pm2--менеджер-процессов)
7. [Nginx — проксирование](#6-nginx--проксирование)
8. [SSL сертификат](#7-ssl-сертификат)
9. [Почта (Email) — полная настройка](#8-почта-email--полная-настройка)
10. [Известные ошибки и решения](#9-известные-ошибки-и-решения)
11. [Команды диагностики](#10-команды-диагностики)
12. [Золотые правила](#11-золотые-правила)
13. [Чеклист деплоя](#12-чеклист-деплоя)

---

## Реквизиты сервера

| Параметр | Значение |
|----------|----------|
| **VPS IP** | 77.222.37.120 |
| **ОС** | Ubuntu 24.04 |
| **Панель управления** | Hestia CP v1.9.4 |
| **URL панели** | https://77.222.37.120:8083 |
| **Домен** | help152fz.ru |
| **GitHub** | https://github.com/sae230679-del/Audit-Expert |
| **Каталог проекта** | /var/www/help152fz.ru |
| **Порт приложения** | 5000 (production) |
| **Пользователь SSH** | admin |
| **БД** | postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz |

---

## 1. Подготовка сервера

### Требования
- Ubuntu 22.04 / 24.04
- Node.js 20+
- PostgreSQL 15+
- Nginx (через Hestia или вручную)
- PM2

### Установка Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Должен показать v20.x
```

### Установка PM2
```bash
sudo npm install -g pm2
```

### Установка PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
```

---

## 2. SSH доступ и Hestia CP

### Проблема: Невозможно подключиться по SSH

**Симптомы:**
- Подключение зависает или отклоняется
- Ошибка "Permission denied"
- В VNC: `Directory 'etc/ssh' does not exist`

**Причина:** В Hestia по умолчанию SSH Access = `nologin` для пользователя admin.

**Решение (пошагово):**

**Шаг 1:** Установить SSH сервер (через VNC консоль хостинга):
```bash
apt update
apt install openssh-server -y
systemctl enable ssh
systemctl start ssh
```

**Шаг 2:** Изменить SSH Access в Hestia:
1. Войти: `https://77.222.37.120:8083`
2. Редактировать пользователя **admin** (карандаш)
3. Нажать **Advanced Options**
4. Изменить **SSH Access** с `nologin` → `bash`
5. Сохранить

**Шаг 3:** Подключиться:
```bash
ssh admin@77.222.37.120
```

### Важно:
- Подключаться как `admin`, НЕ как `root`
- Для root-команд: `sudo`
- Пароль SSH = пароль Hestia (пользователь admin)

### WinSCP: Использовать SCP, а не SFTP!
На данном сервере SFTP протокол может не работать даже при установленном openssh-sftp-server. **Использовать протокол SCP** в настройках WinSCP.

---

## 3. База данных PostgreSQL

### Создание БД и пользователя
```bash
sudo -u postgres psql

CREATE DATABASE help152fz;
CREATE USER help152fz_user WITH ENCRYPTED PASSWORD 'H3lp152Fz2026sec';
GRANT ALL PRIVILEGES ON DATABASE help152fz TO help152fz_user;
ALTER DATABASE help152fz OWNER TO help152fz_user;
\q
```

### Восстановление из дампа
```bash
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz < /path/to/dump.sql
```

### Проверка таблиц
```bash
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz -c "\dt"
```

### Важно по паролям:
- **Не использовать спецсимволы** (!, $, #) в паролях — bash интерпретирует их
- Надёжный пароль: буквы + цифры + простые символы (H3lp152Fz2026sec)

---

## 4. Деплой приложения

### Вариант А: Через Git (рекомендуется)
```bash
cd /var/www
git clone https://github.com/sae230679-del/Audit-Expert help152fz.ru
cd help152fz.ru
git config --global --add safe.directory /var/www/help152fz.ru
```

### Вариант Б: Через WinSCP (бэкап-архив)
1. Загрузить архив через WinSCP (протокол **SCP**)
2. Распаковать:
```bash
tar xzf backup.tar.gz -C /var/www/help152fz.ru/
```
3. **Проверить структуру!** Архив может содержать вложенный путь:
```bash
# Если получилась вложенная структура /var/www/help152fz.ru/var/www/...
mv /var/www/help152fz.ru/var/www/help152fz.ru/* /var/www/help152fz.ru/
rm -rf /var/www/help152fz.ru/var
```

### Настройка переменных окружения

Создать `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'help152fz',
    script: 'dist/index.cjs',
    cwd: '/var/www/help152fz.ru',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: '5000',
      DOMAIN: 'https://help152fz.ru',
      DATABASE_URL: 'postgresql://help152fz_user:H3lp152Fz2026sec@localhost:5432/help152fz',
      SESSION_SECRET: 'СГЕНЕРИРОВАТЬ: openssl rand -hex 32',
      YOOKASSA_SHOP_ID: '',
      YOOKASSA_SECRET_KEY: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      OPENAI_API_KEY: '',
      GIGACHAT_API_KEY: '',
      DADATA_API_KEY: '',
    }
  }]
};
```

### Установка и сборка
```bash
cd /var/www/help152fz.ru
npm install
npm run build
npm run db:push  # Если нужно синхронизировать схему
```

---

## 5. PM2 — менеджер процессов

### Запуск
```bash
cd /var/www/help152fz.ru
pm2 start ecosystem.config.cjs
pm2 save
```

### Автозапуск при перезагрузке
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u admin --hp /home/admin
pm2 save
```

### PM2 НЕ загружает .env автоматически!
Все переменные окружения **обязательно** указывать в `ecosystem.config.cjs` в блоке `env`.

### Порт занят (EADDRINUSE)
```bash
pm2 delete all
fuser -k 5000/tcp
pm2 start ecosystem.config.cjs
pm2 save
```

### Проверка
```bash
pm2 status
pm2 logs help152fz --lines 50
curl -I http://localhost:5000
```

---

## 6. Nginx — проксирование

### Hestia WEB_SYSTEM
На данном сервере Hestia WEB_SYSTEM может быть отключён. В этом случае:
- Команда `v-add-web-domain` не работает
- Nginx конфигурация настраивается **вручную**

### Конфигурация: `/etc/nginx/conf.d/help152fz.conf`

```nginx
server {
    listen 80;
    server_name help152fz.ru www.help152fz.ru;

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
    }
}
```

### С SSL (HTTPS):
```nginx
server {
    listen 80;
    server_name help152fz.ru www.help152fz.ru;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name help152fz.ru www.help152fz.ru;

    ssl_certificate /etc/letsencrypt/live/help152fz.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/help152fz.ru/privkey.pem;

    location /assets/ {
        root /var/www/help152fz.ru/dist/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

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
    }
}
```

### Применение
```bash
nginx -t && systemctl reload nginx
```

### Проблема: Домен отдаёт другой контент
Если `help152fz.ru` возвращает Content-Length, отличный от `localhost:5000` — дефолтный конфиг nginx перехватывает запросы. Проверить:
```bash
ls /etc/nginx/sites-enabled/
ls /etc/nginx/conf.d/
```
Удалить/переименовать конфликтующие конфиги.

### Важно: Создавать конфиг через heredoc
Не использовать `nano` для критичных конфигов — изменения могут не сохраниться. Использовать `cat >`:
```bash
cat > /etc/nginx/conf.d/help152fz.conf << 'NGINX'
# ... конфигурация ...
NGINX
```

---

## 7. SSL сертификат

### Через Hestia (если WEB_SYSTEM включён):
1. Web → выбрать домен → Edit
2. SSL → Let's Encrypt → Save

### Вручную (certbot):
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d help152fz.ru -d www.help152fz.ru
```

---

## 8. Почта (Email) — полная настройка

### Общая архитектура
Hestia CP управляет Exim4 + Dovecot. Для работы почты:
1. Домен с почтой в Hestia
2. DNS записи у регистратора
3. Почтовые ящики
4. Разблокированный порт 25

### Шаг 1: Добавить домен с почтой в Hestia
1. **WEB** → **Add Web Domain**
2. Domain: `help152fz.ru`
3. IP Address: `77.222.37.120` (ВНЕШНИЙ IP, не 10.x.x.x!)
4. Галочка **Mail Support** ✅
5. Сохранить

### Шаг 2: Получить DKIM ключ
```bash
sudo /usr/local/hestia/bin/v-list-mail-domain-dkim admin help152fz.ru
```
Скопировать PUBLIC KEY в одну строку (убрать переносы).

### Шаг 3: DNS записи у регистратора

#### A записи:
| Имя | Тип | Значение |
|-----|-----|----------|
| @ | A | 77.222.37.120 |
| www | A | 77.222.37.120 |
| mail | A | 77.222.37.120 |
| webmail | A | 77.222.37.120 |

#### MX запись:
| Имя | Тип | Приоритет | Значение |
|-----|-----|-----------|----------|
| @ | MX | 10 | mail.help152fz.ru. |

#### SPF запись:
| Имя | Тип | Значение |
|-----|-----|----------|
| @ | TXT | `v=spf1 a mx ip4:77.222.37.120 ~all` |

#### DKIM запись:
| Имя | Тип | Значение |
|-----|-----|----------|
| mail._domainkey | TXT | `v=DKIM1; k=rsa; p=ПУБЛИЧНЫЙ_КЛЮЧ_В_ОДНУ_СТРОКУ` |

#### DMARC запись (КРИТИЧНО ДЛЯ iCLOUD/APPLE!):
| Имя | Тип | Значение |
|-----|-----|----------|
| _dmarc | TXT | `v=DMARC1; p=quarantine; aspf=r; sp=quarantine; rua=mailto:admin@help152fz.ru; adkim=r; fo=1` |

### Особенности DMARC для iCloud/Apple

Apple/iCloud **строго проверяет** DMARC. С `p=none` — письма на iCloud могут не доходить.

**Обязательные параметры:**
- `p=quarantine` — НЕ `p=none`!
- `aspf=r` — мягкая проверка SPF (relaxed)
- `adkim=r` — мягкая проверка DKIM (relaxed)
- `fo=1` — отчёт о каждой ошибке
- `sp=quarantine` — та же политика для поддоменов

### Шаг 4: Создать почтовые ящики
```bash
sudo /usr/local/hestia/bin/v-add-mail-account admin help152fz.ru info пароль
sudo /usr/local/hestia/bin/v-add-mail-account admin help152fz.ru support пароль
sudo /usr/local/hestia/bin/v-add-mail-account admin help152fz.ru noreply пароль
```

Или через Hestia: **MAIL** → домен → **Add Mail Account**

### Шаг 5: Проверка DNS (подождать 10-15 мин)
```bash
dig TXT mail._domainkey.help152fz.ru +short
dig TXT _dmarc.help152fz.ru +short
dig TXT help152fz.ru +short
dig MX help152fz.ru +short
```

### Шаг 6: Проверить порт 25
```bash
telnet mail.help152fz.ru 25
```
Если порт заблокирован — обратиться в поддержку хостинга.

---

## 9. Известные ошибки и решения

### 9.1. Пустой экран (404 для .js/.css)

**Причина:** Nginx ищет статику в `/home/admin/web/DOMAIN/public_html/`, а не проксирует.

**Решение:**
```bash
cp -r /var/www/help152fz.ru/dist/public/* /home/admin/web/help152fz.ru/public_html/
```
Или настроить Nginx `root` на `/var/www/help152fz.ru/dist/public`.

**Быстрая проверка:**
```bash
ls -la /var/www/help152fz.ru/dist/public/assets/
chmod -R 755 /var/www/help152fz.ru/dist/public/
```

---

### 9.2. Git ownership error

**Ошибка:** `fatal: detected dubious ownership in repository`

**Решение:**
```bash
git config --global --add safe.directory /var/www/help152fz.ru
```

---

### 9.3. Git конфликты на VPS

**Ошибка:** `Your local changes would be overwritten`

**Решение:**
```bash
cd /var/www/help152fz.ru
# Вариант 1: Сохранить изменения
git stash && git pull origin main && git stash pop

# Вариант 2: Отбросить изменения
git reset --hard && git pull origin main

# Вариант 3: Удалить проблемные файлы
rm package-lock.json ecosystem.config.cjs
git pull origin main
```

---

### 9.4. Ошибка авторизации 401 после логина

**Причина:** Nginx не передаёт `X-Forwarded-Proto`, cookies не работают.

**Решение:** Добавить в nginx конфиг:
```nginx
proxy_set_header X-Forwarded-Proto $scheme;  # КРИТИЧНО!
```

---

### 9.5. Ошибка 403 "Доступ только для супер-администратора"

**Причина:** JWT токен создан ДО назначения роли superadmin.

**Решение:** Перелогиниться (выйти и войти заново).

**Проверка роли в БД:**
```bash
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz -c "SELECT email, role FROM users WHERE email = 'email@example.com';"
```

---

### 9.6. Таблица не существует / Миграция

**Причина:** Новые таблицы из schema.ts не созданы в production БД.

**Решение:**
```bash
cd /var/www/help152fz.ru && npm run db:push
```

---

### 9.7. Foreign Key при удалении пользователей

**Ошибка:** `Key (id)=(5) is still referenced from table "admin_section_views"`

**Причина:** Функция deleteUser не удаляла записи из связанных таблиц.

**Решение:** Добавить в storage.ts ПЕРЕД удалением пользователя:
```typescript
await db.delete(schema.adminSectionViews).where(eq(schema.adminSectionViews.adminId, id));
await db.delete(schema.documents).where(eq(schema.documents.managerId, id));
await db.delete(schema.documentVersions).where(eq(schema.documentVersions.createdBy, id));
await db.delete(schema.documentReviews).where(eq(schema.documentReviews.reviewerId, id));
await db.delete(schema.users).where(eq(schema.users.id, id));
```

---

### 9.8. FK Constraint после удаления (призрачная сессия)

**Ошибка:** `Key (user_id)=(5) is not present in table "users"` — ПОСЛЕ удаления.

**Причина:** Сессия удалённого пользователя остаётся в БД, браузер продолжает запросы.

**Решение:**

1. При удалении пользователя очищать сессии:
```sql
DELETE FROM session WHERE sess->>'userId' = 'USER_ID';
```

2. Валидировать userId перед INSERT:
```typescript
async function getValidUserId(sessionUserId: number | undefined): Promise<number | null> {
  if (!sessionUserId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, sessionUserId)).limit(1);
  return user ? user.id : null;
}
```

3. Применить в файлах: `server/analytics-routes.ts`, `server/routes.ts`, `server/tools-routes.ts`

4. Деплой:
```bash
cd /var/www/help152fz.ru && git pull && npm run build && psql "postgresql://..." -c "TRUNCATE session;" && pm2 restart help152fz
```

---

### 9.9. GigaChat SSL "bad end line"

**Ошибка:** `error:0480006C:PEM routines::no start line`

**Причина:** Сертификаты склеены без переноса строки.

**Решение:** Между `-----END CERTIFICATE-----` и `-----BEGIN CERTIFICATE-----` должна быть пустая строка.

**Проверка:**
```bash
cat -A certs/gigachat_chain.pem | grep "END CERT"
```

---

### 9.10. DaData CORS

**Причина:** DaData API не поддерживает CORS для браузера.

**Решение:** Прокси через бэкенд:
```typescript
app.post("/api/dadata/suggest-party", requireAuth, async (req, res) => {
  const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${process.env.DADATA_API_KEY}`,
    },
    body: JSON.stringify(req.body),
  });
  res.json(await response.json());
});
```

**Правило:** Внешние API без CORS → ВСЕГДА прокси через бэкенд.

---

### 9.11. Enum миграция PostgreSQL

**Ошибка:** `invalid input value for enum ai_provider`

**Причина:** Enum в PostgreSQL нужно менять вручную (Drizzle не мигрирует enum).

**Решение:**
```sql
ALTER TYPE ai_provider ADD VALUE 'yandexgpt';
```

**Проверка:**
```sql
SELECT enum_range(NULL::ai_provider);
```

---

### 9.12. Антифрод sendBeacon — неправильный Content-Type

**Причина:** `navigator.sendBeacon()` с `JSON.stringify()` отправляет как `text/plain`.

**Решение:**
```typescript
const blob = new Blob([jsonBody], { type: 'application/json' });
navigator.sendBeacon('/api/antifraud/track', blob);
```

---

### 9.13. WebSocket не работает

**Решение:** В nginx конфиге должны быть:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

### 9.14. Telegram уведомления не приходят

**Решение:** Добавить в ecosystem.config.cjs:
```javascript
TELEGRAM_BOT_TOKEN: 'bot_token',
TELEGRAM_CHAT_ID: 'chat_id'
```

---

### 9.15. Favicon не обновляется

**Решение:** Добавить версию в HTML:
```html
<link rel="icon" href="/favicon.png?v=2" />
```

---

### 9.16. Модальное окно закрывается само

**Причина:** Event bubbling.

**Решение:**
```tsx
<div className="overlay" onClick={onClose}>
  <div className="content" onClick={(e) => e.stopPropagation()}>
    {children}
  </div>
</div>
```

---

### 9.17. Toast не показывается

**Причина:** `<Toaster />` не добавлен в App.tsx.

**Решение:**
```tsx
import { Toaster } from "@/components/ui/toaster";
// ... в конце JSX:
<Toaster />
```

---

### 9.18. Уведомления не сбрасываются

**Причина:** Дубликаты в `admin_section_views`.

**Решение:**
```sql
DELETE FROM admin_section_views
WHERE id NOT IN (
  SELECT MAX(id)
  FROM admin_section_views
  GROUP BY admin_id, section_name
);
```

---

### 9.19. TypeScript ошибки типизации

**Ошибка:** `user.id.slice is not a function`

**Причина:** `users.id` = integer, не string.

**Решение:**
```typescript
String(user.id).slice(0, 8)
String(req.params.id)
```

---

### 9.20. Playwright браузеры не установлены

**Ошибка:** `Failed to launch browser: Executable doesn't exist`

**Решение:**
```bash
npx playwright install chromium
```

---

### 9.21. Изменения не попали на GitHub

**Решение:**
```bash
# В Replit:
git add -A && git commit -m "message" && git push origin main

# На VPS:
git fetch origin && git reset --hard origin/main
npm run build && pm2 restart help152fz
```

**Проверка (хэши должны совпадать):**
```bash
git log --oneline -1              # Локальный
git log --oneline origin/main -1  # GitHub
```

---

## 10. Команды диагностики

```bash
# === PM2 ===
pm2 status
pm2 logs help152fz --lines 100
pm2 logs help152fz --err

# === Nginx ===
nginx -t
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log
grep "help152fz.ru" /var/log/nginx/access.log | tail -20

# === Процессы и порты ===
lsof -i :5000
lsof -i :5432
fuser -k 5000/tcp

# === Файлы и права ===
ls -la /var/www/help152fz.ru/dist/public/assets/
chmod -R 755 /var/www/help152fz.ru/dist/public/

# === База данных ===
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz -c "SELECT email, role FROM users;"
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz -c "SELECT * FROM session;"
PGPASSWORD=H3lp152Fz2026sec psql -h localhost -U help152fz_user -d help152fz -c "\dt"

# === Git ===
git log --oneline -5
git log --oneline origin/main -5
git diff origin/main

# === Timestamp билда ===
ls -la /var/www/help152fz.ru/dist/index.cjs

# === Hestia ===
sudo /usr/local/hestia/bin/v-list-mail-domains admin
sudo /usr/local/hestia/bin/v-list-mail-domain-dkim admin help152fz.ru

# === DNS проверки ===
dig A help152fz.ru +short
dig MX help152fz.ru +short
dig TXT help152fz.ru +short
dig TXT _dmarc.help152fz.ru +short
dig TXT mail._domainkey.help152fz.ru +short

# === Статус сервисов ===
systemctl status nginx
systemctl status postgresql
systemctl status pm2-admin
```

---

## 11. Золотые правила

1. **SSH**: Всегда проверять SSH Access = `bash` в Hestia перед подключением
2. **WinSCP**: Протокол **SCP**, не SFTP
3. **Пароли в bash**: Без спецсимволов (!, $, #) — bash интерпретирует их
4. **Команды Hestia**: Полный путь `/usr/local/hestia/bin/v-*`
5. **PM2 + env**: Все переменные в `ecosystem.config.cjs`, НЕ в .env
6. **Build → Restart**: После ЛЮБОГО изменения `npm run build && pm2 restart help152fz`
7. **Nginx конфиги**: Создавать через `cat >` (heredoc), не через `nano`
8. **X-Forwarded-Proto**: ОБЯЗАТЕЛЬНО в nginx для работы cookies
9. **Почта iCloud**: DMARC = `p=quarantine` с `aspf=r; adkim=r; fo=1`
10. **FK ошибки**: Смотреть constraint name — он указывает на таблицу
11. **Удаление пользователя**: Всегда удалять сессии из БД
12. **Код на VPS**: НИКОГДА не менять напрямую → Replit → GitHub → VPS
13. **Архивы**: Проверять структуру после распаковки (могут быть вложенные пути)

---

## 12. Чеклист деплоя

### Первоначальная установка
- [ ] Установить Node.js 20, PM2, PostgreSQL
- [ ] Настроить SSH доступ (Hestia → bash)
- [ ] Создать БД и пользователя PostgreSQL
- [ ] Развернуть проект в `/var/www/help152fz.ru`
- [ ] `git config --global --add safe.directory /var/www/help152fz.ru`
- [ ] Создать `ecosystem.config.cjs` с env переменными
- [ ] `npm install && npm run build`
- [ ] `npm run db:push` (если нужна синхронизация схемы)
- [ ] Настроить Nginx конфиг с proxy headers
- [ ] SSL через certbot или Hestia
- [ ] `pm2 start ecosystem.config.cjs && pm2 save`
- [ ] Настроить PM2 автозапуск (pm2 startup)
- [ ] Проверить `pm2 logs` и `curl -I http://localhost:5000`

### Обновление (редеплой)
```bash
cd /var/www/help152fz.ru
git stash
git pull origin main
npm install
npm run build
pm2 restart help152fz
pm2 logs help152fz --lines 20
```

### Полная команда редеплоя (одной строкой)
```bash
cd /var/www/help152fz.ru && git pull origin main && npm install && npm run build && pm2 restart help152fz
```

---

## Тестовые аккаунты

После первого запуска автоматически создаются:
- **superadmin** / superadmin123 (суперадмин)
- **admin** / admin123 (админ)
- **user** / user123 (пользователь)

---

## История сессий деплоя

### Сессия 05.02.2026
- Загрузка через WinSCP (SCP протокол, SFTP не работал)
- Распаковка архива с вложенной структурой (mv для выравнивания)
- Установка Node.js 20, PM2, PostgreSQL
- Создание БД `help152fz` с пользователем `help152fz_user`
- Восстановление из дампа — 35 таблиц
- Деплой через PM2 — порт 5000, статус online
- PM2 автозапуск через systemd
- Nginx конфиг в `/etc/nginx/conf.d/help152fz.conf`
- HTTP 200 OK на localhost:5000
- Hestia WEB_SYSTEM отключён — ручная настройка Nginx
- Проблема с доменной маршрутизацией (дефолтный nginx перехватывает)
