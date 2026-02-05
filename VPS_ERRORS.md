# Известные ошибки VPS деплоя и их решения

> Этот файл содержит ВСЕ ошибки, которые возникали при деплое на VPS Hestia.
> **ЧИТАТЬ ПЕРЕД ДЕПЛОЕМ!**
> Последнее обновление: 05.02.2026

---

## КРИТИЧЕСКАЯ ПРОБЛЕМА: SSH доступ к серверу

### Симптомы:
- Невозможно подключиться по SSH: `ssh admin@77.222.37.120`
- Подключение зависает или отклоняется
- Ошибка "Permission denied" при попытке входа
- В VNC консоли: `Directory 'etc/ssh' does not exist` при попытке редактировать sshd_config

### Причина:
В Hestia Control Panel по умолчанию **SSH Access = nologin** для пользователя admin. Это полностью блокирует SSH доступ даже если SSH сервер установлен и работает. Также на свежем VPS может отсутствовать пакет openssh-server.

### Решение (пошагово):

**Шаг 1: Установить SSH сервер (если не установлен)**
Через VNC консоль хостинга:
```bash
apt update
apt install openssh-server -y
systemctl enable ssh
systemctl start ssh
```

**Шаг 2: Изменить SSH Access в Hestia панели**
1. Войти в Hestia: `https://77.222.37.120:8083`
2. Перейти в редактирование пользователя **admin** (клик на карандаш)
3. Нажать **Advanced Options** внизу страницы
4. Изменить **SSH Access** с `nologin` на `bash`
5. Нажать **Save**

**Шаг 3: Проверить подключение**
```powershell
ssh admin@77.222.37.120
```
Пароль — тот же что от панели Hestia (пользователь admin).

### Важно:
- Подключаться как `admin`, НЕ как `root`
- Для команд с правами root использовать `sudo`
- После смены пароля в Hestia — SSH пароль тоже меняется

---

## НАСТРОЙКА ПОЧТЫ (Email) — ПОЛНАЯ ИНСТРУКЦИЯ

### Общая архитектура:
Hestia CP управляет почтовым сервером Exim4 + Dovecot. Для работы почты необходимо:
1. Добавить домен с включённой почтой в Hestia
2. Настроить DNS записи у регистратора домена
3. Создать почтовые ящики
4. Убедиться что порт 25 не заблокирован хостером

---

### Шаг 1: Добавить домен с почтой в Hestia

1. В панели Hestia → **WEB** → **Add Web Domain**
2. Domain: `help152fz.ru`
3. IP Address: `77.222.37.120` (ВНЕШНИЙ IP, не внутренний 10.x.x.x!)
4. Поставить галочку **Mail Support** ✅
5. Нажать **Save**

### Шаг 2: Получить DKIM ключ

```bash
sudo /usr/local/hestia/bin/v-list-mail-domain-dkim admin help152fz.ru
```

Из вывода скопировать **PUBLIC KEY** — всё между `-----BEGIN PUBLIC KEY-----` и `-----END PUBLIC KEY-----`.

**Важно**: Убрать переносы строк — ключ должен быть в ОДНУ строку!

### Шаг 3: Настроить DNS записи у регистратора

Добавить следующие записи:

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

#### DMARC запись (ВАЖНО ДЛЯ iCLOUD/APPLE!):
| Имя | Тип | Значение |
|-----|-----|----------|
| _dmarc | TXT | `v=DMARC1; p=quarantine; aspf=r; sp=quarantine; rua=mailto:admin@help152fz.ru; adkim=r; fo=1` |

### Особенности DMARC для доставки на iCloud/Apple (iPhone):

Apple/iCloud **строго проверяет** DMARC записи. Если использовать `p=none` — письма на iCloud могут не доходить или попадать в спам.

**Обязательные параметры для iCloud:**
- `p=quarantine` — письма без проверки попадают в спам (не `p=none`!)
- `aspf=r` — мягкая проверка SPF (relaxed mode)
- `adkim=r` — мягкая проверка DKIM (relaxed mode)
- `fo=1` — отправлять отчёт о КАЖДОЙ ошибке доставки
- `sp=quarantine` — та же политика для поддоменов

**Пример рабочей DMARC записи для Apple:**
```
v=DMARC1; p=quarantine; aspf=r; sp=quarantine; rua=mailto:admin@help152fz.ru; adkim=r; fo=1
```

### Шаг 4: Создать почтовый ящик

В Hestia: **MAIL** → выбрать домен → **Add Mail Account**

Или через SSH:
```bash
sudo /usr/local/hestia/bin/v-add-mail-account admin help152fz.ru имя_ящика пароль
```

### Шаг 5: Проверка DNS (подождать 10-15 минут после изменений)

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

⚠️ **Если порт 25 заблокирован** — обратиться в поддержку хостинга для разблокировки. Многие VPS провайдеры блокируют порт 25 по умолчанию для защиты от спама.

---

## 1. Пустой экран (404 для .js/.css)

**Причина**: Nginx (Hestia) ищет статику в `/home/admin/web/DOMAIN/public_html`, а не проксирует к Node.js.

**Решение**: После КАЖДОЙ сборки:
```bash
cp -r /var/www/DOMAIN/dist/public/* /home/admin/web/DOMAIN/public_html/
```

---

## 2. Git ownership error

**Ошибка**: `fatal: detected dubious ownership in repository`

**Решение**:
```bash
git config --global --add safe.directory /var/www/DOMAIN
```

---

## 3. PM2 не видит переменные окружения

**Причина**: PM2 НЕ загружает .env автоматически!

**Решение**: Использовать `ecosystem.config.cjs` с явными env переменными.

---

## 4. Ошибка авторизации 401 после логина

**Причина**: Nginx не передаёт X-Forwarded-Proto, cookies не работают.

**Решение**: В nginx.ssl.conf добавить:
```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;  # КРИТИЧНО!
    proxy_cache_bypass $http_upgrade;
}
```

После: `nginx -t && systemctl reload nginx`

---

## 5. Таблица не существует

**Причина**: Новые таблицы в schema.ts не созданы в production БД.

**Решение**:
```bash
cd /var/www/DOMAIN && npm run db:push
```

---

## 6. WebSocket не работает

**Решение**: В nginx.ssl.conf должны быть:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

## 7. Telegram уведомления не приходят

**Решение**: Добавить в ecosystem.config.cjs:
```javascript
TELEGRAM_BOT_TOKEN: 'bot_token',
TELEGRAM_CHAT_ID: 'chat_id'
```

---

## 8. Foreign Key при удалении пользователей

**Ошибка**: `Key (id)=(5) is still referenced from table "admin_section_views"`

**Причина**: Функция deleteUser не удаляла записи из связанных таблиц.

**Решение**: Добавить в storage.ts ПЕРЕД удалением пользователя:
```typescript
await db.delete(schema.adminSectionViews).where(eq(schema.adminSectionViews.adminId, id));
await db.delete(schema.documents).where(eq(schema.documents.managerId, id));
await db.delete(schema.documentVersions).where(eq(schema.documentVersions.createdBy, id));
await db.delete(schema.documentReviews).where(eq(schema.documentReviews.reviewerId, id));
await db.delete(schema.users).where(eq(schema.users.id, id));
```

---

## 9. FK Constraint после удаления (сессия)

**Ошибка**: `Key (user_id)=(5) is not present in table "users"` — появляется ПОСЛЕ удаления

**Причина**: Сессия удалённого пользователя остаётся в БД, браузер продолжает запросы.

**Решение**: При удалении пользователя очищать сессии:
```sql
DELETE FROM session WHERE sess->>'userId' = 'USER_ID';
```

И проверять userId перед INSERT:
```typescript
async function getValidUserId(sessionUserId: number | undefined): Promise<number | null> {
  if (!sessionUserId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, sessionUserId)).limit(1);
  return user ? user.id : null;
}
```

---

## 10. GigaChat SSL "bad end line"

**Ошибка**: `error:0480006C:PEM routines::no start line`

**Причина**: Сертификаты склеены без переноса строки.

**Решение**: Между `-----END CERTIFICATE-----` и `-----BEGIN CERTIFICATE-----` должна быть пустая строка.

---

## 11. DaData CORS

**Причина**: DaData API не поддерживает CORS для браузера.

**Решение**: Прокси через бэкенд:
```typescript
app.post("/api/dadata/suggest-party", requireAuth, async (req, res) => {
  const response = await fetch("https://suggestions.dadata.ru/...", {
    headers: { "Authorization": `Token ${process.env.DADATA_API_KEY}` },
    body: JSON.stringify(req.body),
  });
  res.json(await response.json());
});
```

---

## 12. Enum миграция

**Ошибка**: "invalid input value for enum ai_provider"

**Решение**: Enum в PostgreSQL меняется вручную:
```sql
ALTER TYPE ai_provider ADD VALUE 'yandexgpt';
```

---

## 13. Антифрод sendBeacon

**Причина**: `navigator.sendBeacon()` с `JSON.stringify()` отправляет как `text/plain`.

**Решение**: Использовать Blob:
```typescript
const blob = new Blob([jsonBody], { type: 'application/json' });
navigator.sendBeacon('/api/antifraud/track', blob);
```

---

## 14. Ошибка 403 "Доступ только для супер-администратора"

**Причина**: JWT токен создан ДО назначения роли superadmin.

**Решение**: Перелогиниться (выйти и войти заново).

---

## 15. Favicon не обновляется

**Решение**: Добавить версию в HTML:
```html
<link rel="icon" href="/favicon.png?v=2" />
```

---

## 16. Изменения не попали на GitHub

**Решение**:
```bash
# В Replit:
git add -A && git commit -m "message" && git push origin main

# На VPS:
git fetch origin && git reset --hard origin/main
npm run build && pm2 restart help152fz
```

---

## Чеклист деплоя

1. [ ] Создать БД в PostgreSQL
2. [ ] Создать пользователя БД
3. [ ] Склонировать репозиторий в /var/www/DOMAIN
4. [ ] `git config --global --add safe.directory /var/www/DOMAIN`
5. [ ] Создать ecosystem.config.cjs с env переменными
6. [ ] `npm install && npm run build`
7. [ ] `npm run db:push`
8. [ ] Скопировать assets: `cp -r dist/public/* /home/admin/web/DOMAIN/public_html/`
9. [ ] Настроить nginx.ssl.conf с proxy headers
10. [ ] SSL через Hestia (Let's Encrypt)
11. [ ] `pm2 start ecosystem.config.cjs`
12. [ ] `pm2 save`
13. [ ] Проверить `pm2 logs`

---

## Быстрые команды диагностики

```bash
# PM2 логи
pm2 logs help152fz --lines 100

# Nginx логи
tail -50 /var/log/nginx/error.log

# Процессы на портах
lsof -i :3001
lsof -i :5432

# База данных
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz -c "SELECT email, role FROM users;"

# Git проверка
git log --oneline -5

# Hestia команды (полный путь!)
sudo /usr/local/hestia/bin/v-list-mail-domains admin
sudo /usr/local/hestia/bin/v-list-mail-domain-dkim admin help152fz.ru
```

---

## ЗОЛОТЫЕ ПРАВИЛА

1. **SSH**: Всегда проверять SSH Access = bash в Hestia перед подключением
2. **Команды Hestia**: Использовать полный путь `/usr/local/hestia/bin/v-*`
3. **Почта iCloud**: DMARC обязательно `p=quarantine` с `aspf=r; adkim=r; fo=1`
4. **Build → Restart**: После ЛЮБОГО изменения `npm run build && pm2 restart help152fz`
5. **FK ошибки**: Смотреть constraint name — он указывает на таблицу
6. **Сессии**: При удалении пользователя — удалять сессии из БД
7. **Никогда не менять файлы на VPS напрямую**: Replit → GitHub → VPS

---

## Контакты и ресурсы

- **Проект**: Help152FZ
- **VPS**: 77.222.37.120 (Ubuntu 24.04, Hestia CP v1.9.4)
- **GitHub**: https://github.com/sae230679-del/Audit-Expert
- **Домен**: help152fz.ru
- **База данных**: postgresql://help152fz:Help152FZ2025@localhost:5432/help152fz
- **Порт приложения**: 3001
- **Панель Hestia**: https://77.222.37.120:8083
