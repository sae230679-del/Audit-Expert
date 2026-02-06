# SecureLex.ru - Контекст сессии и справочник

**При начале новой сессии скажите агенту:** "Прочитай файл SESSION_CONTEXT.md чтобы вспомнить контекст проекта"

---

## Текущее состояние проекта

- **Статус**: Продакшн на VPS, работает
- **URL**: https://securelex.ru
- **Платформа разработки**: Replit
- **Хостинг продакшна**: VPS 77.222.46.145 (Hestia Control Panel, Ubuntu 24.04)

---

## Учётные данные и секреты

### VPS Server (77.222.46.145)
- **SSH**: root@77.222.46.145
- **Hestia Panel**: https://77.222.46.145:8083 (admin)

### PostgreSQL Database (Production)
```
Host: localhost:5432
Database: securelex
User: securelex
Password: SecureLex2024
DATABASE_URL: postgresql://securelex:SecureLex2024@localhost:5432/securelex
```

### Session Secret (Production)
```
SESSION_SECRET: 42b41da0c03fde37f014d943295cb5c21c148dd60299011d654759cef02afa35
```

### Домен
- **Registrar**: reg.ru
- **DNS**: ns1.reg.ru, ns2.reg.ru
- **A записи**: @ → 77.222.46.145, www → 77.222.46.145

### Master Admin
- **Email**: sae230679@yandex.ru
- **PIN для удаления/изменения**: 212379

---

## Структура файлов на VPS

```
/var/www/securelex.ru/           # Код приложения
├── dist/
│   ├── index.cjs                # Скомпилированный сервер
│   └── public/                  # Скомпилированный фронтенд
│       ├── assets/              # JS, CSS файлы
│       └── index.html
├── ecosystem.config.cjs         # PM2 конфигурация
└── package.json

/home/admin/web/securelex.ru/
├── public_html/                 # Nginx отдаёт статику отсюда!
│   └── assets/                  # КОПИРОВАТЬ сюда после сборки!
└── ...

/home/admin/conf/web/securelex.ru/
├── nginx.ssl.conf               # HTTPS конфигурация
└── nginx.conf                   # HTTP конфигурация
```

---

## Команды для деплоя

### Полный редеплой (одна команда)
```bash
cd /var/www/securelex.ru && git pull origin main && npm install && npm run build && cp -r dist/public/* /home/admin/web/securelex.ru/public_html/ && pm2 restart securelex
```

### Отдельные команды
```bash
# Pull код
cd /var/www/securelex.ru && git pull origin main

# Установка зависимостей
npm install

# Сборка
npm run build

# ВАЖНО: Копировать assets в public_html
cp -r /var/www/securelex.ru/dist/public/* /home/admin/web/securelex.ru/public_html/

# Перезапуск
pm2 restart securelex

# Логи
pm2 logs securelex --lines 50

# Статус
pm2 status
```

---

## Известные ошибки и решения (VPS деплой)

> **ВАЖНО**: Этот раздел содержит ВСЕ ошибки, которые возникали при деплое на VPS.
> При деплое нового сайта - прочитай этот раздел ПЕРЕД началом работы!

---

### 1. Пустой экран после деплоя (404 для .js/.css)
**Причина**: Nginx (Hestia) перехватывает запросы к статическим файлам и ищет их в `/home/admin/web/DOMAIN/public_html`, а не проксирует к Node.js.

**Симптомы**:
- Белый экран в браузере
- В Network tab: 404 для файлов /assets/*.js, /assets/*.css
- Content-Type: text/html вместо application/javascript

**Решение**: После КАЖДОЙ сборки копировать assets:
```bash
cp -r /var/www/DOMAIN/dist/public/* /home/admin/web/DOMAIN/public_html/
```

**ОБЯЗАТЕЛЬНО** добавить эту команду в скрипт деплоя!

---

### 2. Git ownership error
**Ошибка**: `fatal: detected dubious ownership in repository`

**Причина**: Git не доверяет репозиторию, если владелец папки отличается от текущего пользователя.

**Решение**:
```bash
git config --global --add safe.directory /var/www/DOMAIN
```

---

### 3. DATABASE_URL must be set / PM2 не видит переменные окружения
**Причина**: PM2 НЕ загружает переменные из .env файла автоматически!

**Симптомы**:
- Ошибка при старте: "DATABASE_URL must be set"
- Приложение падает сразу после запуска
- `pm2 logs` показывает ошибки подключения к БД

**Решение**: Создать `ecosystem.config.cjs` с явными env переменными:
```javascript
module.exports = {
  apps: [{
    name: 'appname',
    script: 'dist/index.cjs',
    cwd: '/var/www/DOMAIN',
    env: {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
      SESSION_SECRET: 'random-secret-string',
      NODE_ENV: 'production',
      PORT: '3001',
      DOMAIN: 'https://DOMAIN'
    }
  }]
};
```

Запуск:
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

---

### 4. SSL Certificate
**Решение**: Let's Encrypt через Hestia Control Panel
1. Зайти в Hestia → Web → выбрать домен
2. Edit → SSL → Let's Encrypt
3. Поставить галочки и сохранить

---

### 5. Nginx отдаёт text/html вместо JavaScript
**Причина**: Hestia создаёт catch-all location который перехватывает все запросы.

**Симптомы**:
- В консоли браузера: "Expected JavaScript module" 
- Content-Type файлов .js = text/html
- Приложение не загружается

**Решение**: См. пункт 1 - копировать assets в public_html

---

### 6. Ошибка авторизации "Unauthorized" (401) после логина
**Причина**: Nginx не передаёт заголовок X-Forwarded-Proto, и Express не знает что запрос пришёл по HTTPS. Secure cookies не устанавливаются.

**Симптомы**:
- Логин проходит успешно, но сразу редирект на /login
- В консоли: 401 на `/api/auth/me`
- В PM2 логах: `Cookie settings: sameSite=none, secure=true`

**Решение**: Добавить в nginx.ssl.conf:
```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;   # КРИТИЧНО!
    proxy_cache_bypass $http_upgrade;
}
```

После изменения:
```bash
nginx -t && systemctl reload nginx
pm2 restart appname
```

**ВАЖНО**: Попросить пользователя очистить cookies и войти заново!

---

### 7. No superadmin found / Пустая база данных
**Причина**: После npm run db:push таблицы созданы, но данных нет.

**Решение**: 
1. Создать мастер-админа через SQL
2. Или запустить seed скрипт если есть

```bash
PGPASSWORD=password psql -U user -h localhost -d dbname -c "INSERT INTO users (email, name, role, is_master_admin, password_hash) VALUES ('email@example.com', 'Admin', 'superadmin', true, 'bcrypt_hash') ON CONFLICT (email) DO NOTHING;"
```

---

### 8. Vite catch-all перехватывает API роуты
**Причина**: В dev режиме Vite middleware регистрируется раньше API роутов.

**Симптомы**:
- API возвращает HTML вместо JSON
- `/api/*` роуты не работают
- В response виден Vite HTML template

**Решение**: В `server/app.ts` регистрировать важные API роуты ДО вызова `registerRoutes()`:
```typescript
// СНАЧАЛА критичные роуты
app.use('/api/analytics', analyticsRouter);
app.use('/api/tracking', trackingRouter);

// ПОТОМ остальные
await registerRoutes(app);
```

---

### 9. Drizzle миграции падают с ошибкой
**Причина**: Попытка изменить тип primary key (serial ↔ varchar).

**Симптомы**:
- `npm run db:push` падает
- Ошибки про ALTER TABLE
- "cannot alter column type"

**Решение**: 
1. НИКОГДА не менять тип ID колонок!
2. Использовать `npm run db:push --force`
3. Если schema.ts изменился - откатить изменения ID полей

---

### 10. Таблица express_criteria не существует
**Причина**: Новая таблица добавлена в schema.ts, но не создана в production БД.

**Симптомы**:
- Ошибка: `relation "express_criteria" does not exist`
- Экспресс-проверка не работает

**Решение**: Запустить миграцию на VPS:
```bash
cd /var/www/DOMAIN && npm run db:push
```

---

### 11. Настройка из админ-панели не работает
**Причина**: Код читает одну настройку, а админ-панель сохраняет другую.

**Пример**: Админ-панель сохраняет `free_audit_limit`, а код читает `free_express_limit_per_24h`.

**Как найти**:
1. Найти название поля в админ-панели (tsx файл)
2. Найти где это используется в storage.ts или routes.ts
3. Убедиться что ключи совпадают

**Решение**: Синхронизировать названия ключей в коде и UI.

---

### 12. WebSocket не работает через Nginx
**Причина**: Nginx не настроен для WebSocket upgrade.

**Симптомы**:
- WS соединения обрываются
- Real-time функции не работают

**Решение**: В nginx.ssl.conf должны быть:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

---

### 13. Telegram уведомления не приходят
**Причина**: TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID не добавлены в ecosystem.config.cjs.

**Решение**: Добавить в env секцию:
```javascript
env: {
  // ... другие переменные
  TELEGRAM_BOT_TOKEN: 'bot_token',
  TELEGRAM_CHAT_ID: 'chat_id'
}
```

---

### 14. Rate limiter блокирует легитимные запросы
**Симптомы**:
- 429 Too Many Requests
- Формы не отправляются

**Решение**: Увеличить лимиты в `server/app.ts`:
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // было 100
});
```

---

## Чеклист перед деплоем нового сайта

1. [ ] Создать БД в PostgreSQL
2. [ ] Создать пользователя БД
3. [ ] Склонировать репозиторий в /var/www/DOMAIN
4. [ ] Добавить safe.directory в git config
5. [ ] Создать ecosystem.config.cjs с env переменными
6. [ ] Запустить npm install && npm run build
7. [ ] Запустить npm run db:push
8. [ ] Скопировать assets в public_html
9. [ ] Настроить nginx.ssl.conf с proxy headers
10. [ ] Добавить SSL через Hestia
11. [ ] Запустить pm2 start ecosystem.config.cjs
12. [ ] Проверить pm2 logs на ошибки
13. [ ] Создать superadmin пользователя
14. [ ] Протестировать авторизацию
15. [ ] Сохранить pm2 save

---

## Проверка работоспособности

```bash
# Проверить что приложение отвечает
curl -I http://127.0.0.1:3001

# Проверить что assets отдаются с правильным Content-Type
curl -I http://127.0.0.1:3001/assets/index-BawWpGlE.css
# Должно быть: Content-Type: text/css

# Проверить PM2
pm2 status
# Должно быть: securelex | online

# Проверить логи на ошибки
pm2 logs securelex --lines 20
```

---

## GitHub Integration

- **Repository**: Подключен к Replit
- **Branch**: main
- **CI/CD**: При push на main можно запустить деплой вручную на VPS

---

## Архитектура приложения

- **Frontend**: React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Session-based (connect-pg-simple)
- **Payments**: YooKassa
- **AI Consultation**: Yandex GPT (primary) / GigaChat (fallback) / OpenAI (optional)
- **AI Audit**: GigaChat / OpenAI
- **Telegram Bots**: 
  - @help152fz_bot (TELEGRAM_AI_BOT_TOKEN) - AI консультации по ФЗ-152
  - @OrderSecureLex_bot (TELEGRAM_BOT_TOKEN) - уведомления о заказах

## Система документооборота (MVP)

### Роли
- **manager**: Создание и управление документами, отправка клиенту
- **lawyer**: Проверка документов, одобрение/возврат на доработку

### Workflow документов
```
draft → in_review → revision → approved → delivered
         ↑                        ↓
         └────────────────────────┘
```

### API Endpoints
- `GET /api/manager/documents` - список документов менеджера
- `POST /api/manager/documents` - создать документ
- `PATCH /api/manager/documents/:id` - обновить документ
- `POST /api/manager/documents/:id/send-to-review` - отправить на проверку
- `POST /api/manager/documents/:id/deliver` - отметить как доставленный
- `DELETE /api/manager/documents/:id` - удалить документ

- `GET /api/lawyer/documents` - документы для проверки
- `POST /api/lawyer/documents/:id/review` - проверить документ
- `GET /api/lawyer/documents/:id/reviews` - история проверок

### Типы документов
privacy_policy, consent_form, cookie_policy, cookie_banner, user_agreement, offer, terms_of_service, confidentiality, other

### Таблицы БД
- `documents` - основная таблица документов
- `document_versions` - версии документов с файлами
- `document_reviews` - история проверок юристом

---

## Скрипт восстановления из бэкапа

Для восстановления настроек из JSON бэкапа:
```bash
npx tsx scripts/restore-backup.ts путь/к/файлу.json
```

Скрипт восстанавливает:
- systemSettings (SMTP, контакты, реквизиты)
- designThemes (темы оформления)
- referralSettings (реферальная программа)
- serviceConfigs (услуги)
- toolConfigs (инструменты)

**ВНИМАНИЕ:** Скрипт НЕ восстанавливает пользователей - они должны быть в отдельном бэкапе!

---

## Последние изменения

### Сессия 2026-01-19 (вечер) - Исправление системы уведомлений

**Проблемы найдены и исправлены:**

1. **Страница экспресс-проверок показывала неправильные данные**
   - **Проблема**: Страница `/admin/express-audits` брала данные из таблицы `audits` вместо `express_checks`
   - **Решение**: 
     - Добавлен метод `getAllExpressChecks()` в storage.ts
     - API `/api/admin/express-audits` теперь возвращает данные из `express_checks`
     - Переписана страница `admin-express-audits.tsx` с правильным типом ExpressCheck
     - Добавлены статистические карточки (всего, критичных, средний риск, низкий риск)
     - Фильтрация по severity вместо status
     - Отображение контактной информации (компания, email, телефон)

2. **Уведомления не сбрасывались после просмотра раздела**
   - **Проблема**: Счётчики `newReferrals` и `pendingPayouts` считались глобально, игнорируя `lastViewedAt` админа
   - **Причина**: Дубликаты в таблице `admin_section_views` и неправильная логика подсчёта
   - **Решение**:
     - Удалены дубликаты из `admin_section_views` через SQL
     - Функция `getAdminUnreadCounts()` теперь возвращает персональные счётчики для всех секций
     - Добавлена логика подсчёта `newReferrals` и `pendingPayouts` с учётом `lastViewedAt`
     - API `/api/admin/notification-counts` теперь возвращает полностью персональные данные
   - **SQL для очистки дубликатов на продакшене**:
     ```sql
     DELETE FROM admin_section_views WHERE id NOT IN (SELECT MAX(id) FROM admin_section_views GROUP BY admin_id, section_name);
     ```
     Выполнить через: `psql "postgresql://securelex:SecureLex2024@localhost:5432/securelex" -c "..."`

3. **Добавлен сброс уведомлений для реферальной программы**
   - Добавлен `useAdminNotifications` в `superadmin-referral-settings.tsx`
   - При переходе на вкладку "Заявки" вызывается `markSectionViewed("referrals")`
   - При переходе на вкладку "Выплаты" вызывается `markSectionViewed("payouts")`

4. **Конфликт Telegram ботов (409 Conflict)**
   - **Проблема**: В Replit и на продакшене использовался один и тот же токен бота `@help152fz_bot`
   - **Решение**: Обновлён секрет `TELEGRAM_AI_BOT_TOKEN` в Replit на токен тестового бота `@testsecurelex_bot`
   - **Разделение**:
     - Replit (dev): `@testsecurelex_bot`
     - Production: `@help152fz_bot`

5. **Звуки ICQ уведомлений**
   - Звуки генерируются через Web Audio API (не base64 файлы)
   - Воспроизводятся только при появлении НОВЫХ уведомлений (увеличении счётчика)
   - НЕ воспроизводятся при первой загрузке или переходе по разделам

**Изменённые файлы:**
- `server/storage.ts` - getAllExpressChecks(), getAdminUnreadCounts(), markAdminSectionViewed()
- `server/routes.ts` - /api/admin/express-audits, /api/admin/notification-counts
- `client/src/pages/admin-express-audits.tsx` - полностью переписан
- `client/src/pages/superadmin-referral-settings.tsx` - добавлен useAdminNotifications
- `client/src/lib/admin-notifications.tsx` - без изменений, но документирован

**Commits:**
- c7dfe2b9 - Improve referral program notifications
- 3096d032 - Update notification system to show personal counters

---

- **2026-01-19**: Исправлена страница результата оплаты экспресс-отчёта
  - **Проблема**: После оплаты через YooKassa показывалась ошибка "Не удалось определить заказ"
  - **Причина**: `payment-result.tsx` не обрабатывал параметр `order_id` с типом `express_report`
  - **Решение**: Добавлена обработка `express_report` в payment-result.tsx
  - **Новый API**: `GET /api/orders/express-report/:id` - публичный endpoint для получения данных заказа
  - **Результат**: Теперь показывается "Спасибо за заказ! Ваша заявка принята в работу."
  - **Commit**: c5330580

- **2026-01-19**: Создан полный бэкап базы данных
  - **Файл**: `/home/admin/backups/securelex/securelex_backup.dump` (673K)
  - **Содержимое**: Все таблицы (users, referrals, payments, settings, audits и др.)
  - **Рабочая команда бэкапа**:
    ```bash
    sudo -u postgres pg_dump -d securelex -F c -f /var/lib/postgresql/securelex_backup.dump && sudo cp /var/lib/postgresql/securelex_backup.dump /home/admin/backups/securelex/
    ```
  - **ВАЖНО**: База называется `securelex`, НЕ `securelex_db`

- **2026-01-19**: Ошибки при создании бэкапа (решены)
  - Ошибка 1: `Peer authentication failed for user "securelex"` → Решение: использовать `sudo -u postgres`
  - Ошибка 2: `Permission denied` для /home/admin/backups/ → Решение: писать в /var/lib/postgresql/, потом копировать
  - Ошибка 3: `database "securelex_db" does not exist` → Решение: правильное имя `securelex`

- **2026-01-18**: Добавлено 19 новых статей в справочник (всего 29 статей)
  - Cookies и ПД (topic 28): 5 статей о cookies, требованиях ФЗ-152, баннерах, категориях, третьих сторонах
  - Согласие на обработку (topic 7): 3 статьи о формах согласия, рассылках, отзыве согласия
  - Политика конфиденциальности (topic 10): 4 статьи о структуре, размещении, актуализации, ошибках
  - Чек-листы (topic 25): 3 практических чек-листа для проверки cookies, форм согласия, политики
  - Шаблоны документов (topic 26): 4 готовых шаблона для интернет-магазинов
  - Обновлён KEYWORDS_MAP в guide-knowledge-service.ts для улучшения поиска по новым статьям
  - Добавлены ключевые слова: cookie, баннер, шаблон, рассылка, отзыв, аналитика, метрика
  
- **2026-01-18**: Завершена система управления документами (MVP Фаза 1)
  - Роли manager и lawyer добавлены в middleware
  - Таблицы: documents, document_versions, document_reviews
  - Панель менеджера: создание, редактирование, отправка на проверку, доставка
  - Панель юриста: проверка документов, одобрение/возврат на доработку, история проверок
  - Workflow документов: draft → in_review → revision → approved → delivered
  - Страница настроек интеграций документооборота в superadmin

- **2026-01-17**: Улучшения UX экспресс-проверки
  - Авто-скролл к форме через 5 секунд после загрузки страницы
  - Авто-скролл во время проверки к текущему критерию (срабатывает один раз)
  - Драматические анимации: красное мигание для ошибок, жёлтая пульсация для предупреждений, зелёные искры для успеха
  - Всплывающее окно с суммой штрафов и CTA "Закажите полный аудит!"
  - Полная адаптация для мобильных устройств
  - Все анимации поддерживают prefers-reduced-motion для доступности
- **2026-01-17**: Исправлена настройка лимита IP
  - Проблема: настройка "Лимит бесплатных проверок (на IP)" в админ-панели не работала
  - Причина: код читал `free_express_limit_per_24h`, а админ-панель сохраняла `free_audit_limit`
  - Решение: storage.ts теперь читает `free_audit_limit`
- **2026-01-17**: Создан скрипт деплоя `scripts/deploy.sh`
- **2026-01-17**: Добавлено поле реферального кода в форму регистрации
  - Добавлено поле `referredByCode` в таблицу `users` (varchar 50)
  - Добавлен `referralCode` в `registerSchema` (опционально)
  - Поле в форме с иконкой Gift, автоматически переводит в uppercase
  - Бэкенд валидирует код: проверяет `referralParticipants` и `customReferralLinks`
  - При успешной регистрации код сохраняется в `users.referredByCode`
- **2026-01-17**: Исправлена аналитика посещений
  - Проблема: роуты `/api/analytics/track/*` возвращали HTML вместо JSON
  - Причина: Vite catch-all middleware перехватывал запросы до регистрации analytics routes
  - Решение: в `server/app.ts` роуты аналитики регистрируются ДО вызова `registerRoutes()`
  - Добавлен публичный роут `/api/analytics` (без auth) для клиентского трекера
  - Работают: визиты, просмотры страниц, UTM-метки, устройства, браузеры
  - Данные сохраняются в таблицы `site_visits` и `page_views`
- **2026-01-17**: Настроены Telegram уведомления
  - Добавлены TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в ecosystem.config.cjs
  - Работают уведомления для: форма связи, заказы, реферальная программа
  - Rate limiter увеличен с 100 до 500 запросов за 15 минут
- **2026-01-17**: Исправлена ошибка авторизации (401 Unauthorized)
  - Добавлены proxy headers в nginx (X-Forwarded-Proto)
  - Теперь Express корректно определяет HTTPS и устанавливает secure cookies
- **2026-01-17**: Восстановлены настройки из бэкапа (28 настроек, 3 темы, 11 инструментов)
- **2026-01-17**: Первичный деплой на VPS 77.222.46.145
  - Настроен PM2 с ecosystem.config.cjs
  - Настроен Nginx reverse proxy
  - Решена проблема с пустым экраном (копирование assets в public_html)
  - Обновлён SSL сертификат Let's Encrypt

---

## Что делать при проблемах

1. **Сайт не открывается**: Проверить `pm2 status`, при необходимости `pm2 restart securelex`
2. **Пустой экран**: Скопировать assets в public_html
3. **Ошибки в консоли браузера 404**: Скопировать assets в public_html
4. **База данных не работает**: Проверить PostgreSQL `systemctl status postgresql`
5. **SSL ошибки**: Обновить сертификат в Hestia Panel

---

## Контакты и ресурсы

- **Replit проект**: SecureLex.ru
- **Домен registrar**: reg.ru
- **VPS провайдер**: (уточнить)
- **Hestia Panel**: https://77.222.46.145:8083

---

## Как начать новую сессию

При начале новой сессии скажите агенту:
> "Прочитай файл SESSION_CONTEXT.md чтобы вспомнить контекст проекта"

Агент прочитает этот файл и вспомнит:
- Все учётные данные и секреты
- Структуру проекта
- Известные ошибки и их решения
- Историю изменений

---

## Telegram уведомления

**Bot Token**: 8569043569:AAEhly57cgGYVCKmi7vC7SbyoRp77WFT7Bc
**Chat ID**: -1003581685221

Уведомления приходят для:
- Форма обратной связи
- Заказы полных отчётов (900₽)
- Заказы полных аудитов
- Заявки на реферальную программу
