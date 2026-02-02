# Help152FZ - Полный гайд по настройке и развёртыванию

**ВАЖНО: Прочитай этот файл перед началом любой работы!**

---

## Общая информация о проекте

Платформа для аудита российских сайтов на соответствие законам о защите персональных данных (ФЗ-152, ФЗ-149). Включает:
- Экспресс-проверка по 9 критериям
- Полный аудит по 60+ критериям
- AI-консультации по ФЗ-152
- PDF-отчёты с расчётом штрафов
- Реферальная система
- Интеграция с YooKassa

---

## ВИЗУАЛЬНЫЙ СТИЛЬ (ОТЛИЧИЯ ОТ ИСХОДНОГО)

### Цветовая палитра: Изумрудный/Зелёный

Изменить в `client/src/index.css`:

```css
:root {
  /* Основные цвета - Изумрудная тема */
  --primary: 158 64% 35%;           /* Изумрудный основной */
  --primary-foreground: 0 0% 100%;  /* Белый текст на кнопках */
  
  --accent: 158 50% 45%;            /* Светлый изумрудный для акцентов */
  --accent-foreground: 0 0% 100%;
  
  --secondary: 158 20% 92%;         /* Фоновый изумрудный */
  --secondary-foreground: 158 60% 25%;
  
  --muted: 158 15% 95%;
  --muted-foreground: 158 20% 40%;
  
  --card: 0 0% 100%;
  --card-foreground: 158 30% 15%;
  
  --background: 158 10% 98%;        /* Чуть зеленоватый фон */
  --foreground: 158 30% 10%;
  
  --border: 158 20% 85%;
  --ring: 158 64% 35%;
  
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  --success: 142 76% 36%;
  --warning: 45 93% 47%;
}

.dark {
  --primary: 158 64% 50%;
  --primary-foreground: 0 0% 100%;
  
  --accent: 158 50% 30%;
  --accent-foreground: 0 0% 100%;
  
  --secondary: 158 20% 15%;
  --secondary-foreground: 158 30% 90%;
  
  --muted: 158 15% 18%;
  --muted-foreground: 158 20% 65%;
  
  --card: 158 15% 12%;
  --card-foreground: 158 20% 95%;
  
  --background: 158 15% 8%;
  --foreground: 158 20% 95%;
  
  --border: 158 20% 20%;
  --ring: 158 64% 50%;
}
```

### Шрифт Inter

1. Добавить в `client/index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

2. Изменить в `client/src/index.css`:
```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

3. Изменить в `tailwind.config.ts`:
```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
},
```

### Острые углы вместо скруглённых

Изменить в `tailwind.config.ts`:
```typescript
borderRadius: {
  lg: '0.25rem',    // было 0.5rem
  md: '0.125rem',   // было 0.375rem
  sm: '0.0625rem',  // было 0.25rem
},
```

ИЛИ сохранить скруглённые, но сделать более заметными:
```typescript
borderRadius: {
  lg: '1rem',
  md: '0.75rem',
  sm: '0.5rem',
},
```

### Горизонтальные карточки на главной

Для секции "9 критериев проверки" использовать горизонтальную раскладку вместо сетки:

```tsx
// Вместо grid-cols-3 использовать flex-row с горизонтальными карточками
<div className="space-y-4">
  {criteria.map((item) => (
    <Card key={item.id} className="flex flex-row items-center gap-4 p-4">
      <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <item.icon className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-muted-foreground text-sm">{item.description}</p>
      </div>
      <Badge variant="outline">{item.status}</Badge>
    </Card>
  ))}
</div>
```

### Другое расположение секций

Предлагаемый порядок (отличается от исходного):
1. Hero с формой проверки
2. Блок доверия (статистика проверок, клиенты)
3. Как это работает (шаги)
4. Критерии проверки (горизонтальные карточки)
5. Пакеты услуг
6. Отзывы клиентов
7. FAQ
8. Форма обратной связи

---

## НЕДОСТАЮЩИЕ СТРАНИЦЫ ДЛЯ ДОБАВЛЕНИЯ

### Обязательные страницы:
1. `/full-audit` - Выбор полного аудита по типам сайтов
2. `/full-audit/:siteType` - Детальная страница типа аудита
3. `/tools` - 11 платных инструментов
4. `/cabinet` или `/dashboard` - Личный кабинет пользователя
5. `/guide` - База знаний по ФЗ-152
6. `/ai-chat` - AI-консультант

### Админ-панели:
1. `/superadmin/*` - Управление системой
2. `/admin/*` - Управление заказами
3. `/manager/*` - Панель менеджера документов
4. `/lawyer/*` - Панель юриста

---

## НАСТРОЙКА YOOKASSA

### 1. Получить ключи в личном кабинете YooKassa

### 2. Добавить секреты в Replit:
```
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_XXXXXXXXXXXXXX
```

### 3. Структура интеграции

Файл `server/yookassa.ts`:
```typescript
import { YooCheckout } from '@a2seven/yoo-checkout';

const checkout = new YooCheckout({
  shopId: process.env.YOOKASSA_SHOP_ID!,
  secretKey: process.env.YOOKASSA_SECRET_KEY!,
});

export async function createPayment(params: {
  amount: number;
  description: string;
  returnUrl: string;
  orderId: string;
  userEmail?: string;
}) {
  const payment = await checkout.createPayment({
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    capture: true,
    description: params.description,
    metadata: {
      orderId: params.orderId,
    },
    receipt: params.userEmail ? {
      customer: { email: params.userEmail },
      items: [{
        description: params.description.substring(0, 128),
        quantity: '1',
        amount: {
          value: params.amount.toFixed(2),
          currency: 'RUB',
        },
        vat_code: 1,
      }],
    } : undefined,
  });

  return payment;
}
```

### 4. Webhook для подтверждения оплаты

```typescript
// POST /api/yookassa/webhook
app.post('/api/yookassa/webhook', async (req, res) => {
  const { event, object } = req.body;
  
  if (event === 'payment.succeeded') {
    const orderId = object.metadata?.orderId;
    if (orderId) {
      await storage.updateOrderStatus(orderId, 'paid');
      await storage.processReferralCommission(orderId, object.amount.value);
    }
  }
  
  res.status(200).send('OK');
});
```

### 5. URL для webhook в YooKassa:
```
https://YOUR_DOMAIN/api/yookassa/webhook
```

---

## НАСТРОЙКА РЕФЕРАЛЬНОЙ СИСТЕМЫ

### Таблицы в schema.ts:

```typescript
// Реферальные настройки (глобальные)
export const referralSettings = pgTable("referral_settings", {
  id: serial("id").primaryKey(),
  defaultCommissionPercent: integer("default_commission_percent").default(10),
  minPayoutAmount: integer("min_payout_amount").default(1000),
  isEnabled: boolean("is_enabled").default(true),
  termsText: text("terms_text"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Реферальные партнёры
export const referralPartners = pgTable("referral_partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  referralCode: varchar("referral_code", { length: 50 }).unique().notNull(),
  customCommissionPercent: integer("custom_commission_percent"), // Если null - используется default
  totalEarned: integer("total_earned").default(0),
  totalPaid: integer("total_paid").default(0),
  pendingAmount: integer("pending_amount").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Реферальные переходы
export const referralClicks = pgTable("referral_clicks", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => referralPartners.id),
  referralCode: varchar("referral_code", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  landingPage: varchar("landing_page", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Реферальные клиенты
export const referralClients = pgTable("referral_clients", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => referralPartners.id),
  clientUserId: integer("client_user_id").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Реферальные комиссии
export const referralCommissions = pgTable("referral_commissions", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => referralPartners.id),
  orderId: varchar("order_id", { length: 100 }),
  orderAmount: integer("order_amount").notNull(),
  commissionPercent: integer("commission_percent").notNull(),
  commissionAmount: integer("commission_amount").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, paid
  paymentId: varchar("payment_id", { length: 100 }), // ID оплаченного заказа для идемпотентности
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});
```

### API эндпоинты:

```typescript
// Публичные
GET  /api/referral/partner/:code  - Получить инфо о партнёре по коду
POST /api/referral/track-click    - Трекинг перехода по реферальной ссылке

// Для авторизованных пользователей
GET  /api/referral/my-stats       - Статистика партнёра (мои реф. данные)
POST /api/referral/become-partner - Стать партнёром

// Для админов
GET  /api/admin/referral/partners        - Список всех партнёров
GET  /api/admin/referral/partners/:id    - Детали партнёра
PATCH /api/admin/referral/partners/:id   - Обновить партнёра (% комиссии)
GET  /api/admin/referral/commissions     - Все комиссии
POST /api/admin/referral/commissions/:id/pay - Отметить комиссию как выплаченную

// Настройки (superadmin)
GET  /api/superadmin/referral/settings
PUT  /api/superadmin/referral/settings
```

### Логика начисления комиссии:

```typescript
async function processReferralCommission(orderId: string, orderAmount: number) {
  // 1. Проверить идемпотентность - не было ли уже начисления
  const existing = await db.select()
    .from(referralCommissions)
    .where(eq(referralCommissions.paymentId, orderId));
  
  if (existing.length > 0) return; // Уже обработано
  
  // 2. Найти пользователя по заказу
  const order = await storage.getOrder(orderId);
  if (!order?.userId) return;
  
  // 3. Найти реферального клиента
  const client = await db.select()
    .from(referralClients)
    .where(eq(referralClients.clientUserId, order.userId));
  
  if (client.length === 0) return; // Не реферальный клиент
  
  // 4. Получить партнёра и процент
  const partner = await db.select()
    .from(referralPartners)
    .where(eq(referralPartners.id, client[0].partnerId));
  
  const settings = await storage.getReferralSettings();
  const percent = partner[0].customCommissionPercent ?? settings.defaultCommissionPercent;
  const commission = Math.floor(orderAmount * percent / 100);
  
  // 5. Создать запись комиссии
  await db.insert(referralCommissions).values({
    partnerId: partner[0].id,
    orderId,
    orderAmount,
    commissionPercent: percent,
    commissionAmount: commission,
    status: 'pending',
    paymentId: orderId, // Для идемпотентности
  });
  
  // 6. Обновить pending сумму партнёра
  await db.update(referralPartners)
    .set({ pendingAmount: sql`${referralPartners.pendingAmount} + ${commission}` })
    .where(eq(referralPartners.id, partner[0].id));
}
```

### Cookie для трекинга:

```typescript
// При переходе по реф. ссылке
app.get('/r/:code', async (req, res) => {
  const { code } = req.params;
  
  // Записать клик
  await db.insert(referralClicks).values({
    referralCode: code,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    landingPage: req.query.page as string || '/',
  });
  
  // Установить cookie на 30 дней
  res.cookie('ref', code, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
  
  res.redirect(req.query.page as string || '/');
});

// При регистрации пользователя - привязать к партнёру
if (req.cookies.ref) {
  const partner = await storage.getPartnerByCode(req.cookies.ref);
  if (partner) {
    await db.insert(referralClients).values({
      partnerId: partner.id,
      clientUserId: newUser.id,
    });
  }
}
```

---

## ИЗВЕСТНЫЕ ОШИБКИ И РЕШЕНИЯ

### 1. Пустой экран после деплоя (404 для .js/.css)

**Причина**: Nginx (Hestia) перехватывает запросы к статике и ищет в public_html.

**Решение**: После КАЖДОЙ сборки:
```bash
cp -r /var/www/YOUR_DOMAIN/dist/public/* /home/admin/web/YOUR_DOMAIN/public_html/
```

---

### 2. DATABASE_URL must be set / PM2 не видит переменные

**Причина**: PM2 НЕ загружает .env автоматически!

**Решение**: Создать `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [{
    name: 'appname',
    script: 'dist/index.cjs',
    cwd: '/var/www/YOUR_DOMAIN',
    env: {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
      SESSION_SECRET: 'random-secret-string',
      NODE_ENV: 'production',
      PORT: '3001',
      DOMAIN: 'https://YOUR_DOMAIN',
      YOOKASSA_SHOP_ID: 'xxx',
      YOOKASSA_SECRET_KEY: 'xxx',
    }
  }]
};
```

---

### 3. Авторизация не работает (401 после логина)

**Причина**: Nginx не передаёт X-Forwarded-Proto, secure cookies не работают.

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

После: `nginx -t && systemctl reload nginx && pm2 restart appname`

---

### 4. Foreign Key violation после удаления пользователя (КРИТИЧНО!)

**Ошибка**: `Key (user_id)=(X) is not present in table "users"`

**Причина**: Сессия удалённого пользователя осталась, браузер шлёт запросы.

**Решение**:

1. Добавить helper функцию:
```typescript
async function getValidUserId(sessionUserId: number | undefined): Promise<number | null> {
  if (!sessionUserId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, sessionUserId)).limit(1);
  return user ? user.id : null;
}
```

2. Использовать во ВСЕХ insert с userId:
```typescript
const validUserId = await getValidUserId(req.session.userId);
await db.insert(siteVisits).values({ userId: validUserId, ... });
```

3. При деплое очищать сессии:
```bash
npm run build && psql "..." -c "TRUNCATE session;" && pm2 restart appname
```

---

### 5. SelectItem с пустым value - чёрный экран

**Причина**: Radix UI падает при `<SelectItem value="">`.

**Решение**:
```tsx
// ПЛОХО:
<SelectItem value="">Стандартный</SelectItem>

// ХОРОШО:
<SelectItem value="default">Стандартный</SelectItem>
```

---

### 6. GigaChat SSL ошибки

**Симптом 1**: `bad end line`
**Решение**: Добавить пустую строку в конец PEM файла.

**Симптом 2**: `no start line`
**Причина**: Сертификаты склеены без переноса:
```
-----END CERTIFICATE----------BEGIN CERTIFICATE-----
```
**Решение**: Добавить перенос строки между сертификатами.

---

### 7. Яндекс.Метрика не загружает сайт в iframe

**Решение** в server/app.ts:
```typescript
app.use(
  helmet({
    xFrameOptions: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        frameAncestors: [
          "'self'",
          "https://*.yandex.ru",
          "https://*.yandex.com",
          "https://metrika.yandex.ru",
        ],
      },
    },
  })
);
```

---

### 8. Vite перехватывает API роуты

**Симптом**: API возвращает HTML вместо JSON.

**Решение**: Регистрировать критичные роуты ДО Vite:
```typescript
// СНАЧАЛА API
app.use('/api/analytics', analyticsRouter);
app.use('/api/yookassa', yookassaRouter);

// ПОТОМ остальные (включая Vite)
await registerRoutes(app);
```

---

### 9. При удалении пользователя FK constraint

**Диагностика**: Смотреть имя constraint в ошибке:
```
constraint: 'admin_section_views_admin_id_users_id_fk'
→ Таблица: admin_section_views
```

**Решение**: Добавить удаление в функцию deleteUser():
```typescript
await db.delete(schema.adminSectionViews).where(eq(schema.adminSectionViews.adminId, id));
await db.delete(schema.documents).where(eq(schema.documents.managerId, id));
// ... все таблицы с FK на users
```

---

## ЧЕКЛИСТ ПЕРЕД ДЕПЛОЕМ

1. [ ] Создать БД в PostgreSQL
2. [ ] Создать пользователя БД
3. [ ] Склонировать репозиторий в /var/www/DOMAIN
4. [ ] `git config --global --add safe.directory /var/www/DOMAIN`
5. [ ] Создать ecosystem.config.cjs с env переменными
6. [ ] `npm install && npm run build`
7. [ ] `npm run db:push`
8. [ ] Скопировать assets в public_html
9. [ ] Настроить nginx.ssl.conf с proxy headers
10. [ ] Добавить SSL через Hestia
11. [ ] `pm2 start ecosystem.config.cjs && pm2 save`
12. [ ] Проверить `pm2 logs` на ошибки
13. [ ] Создать superadmin пользователя
14. [ ] Настроить webhook YooKassa
15. [ ] Протестировать оплату

---

## КОМАНДЫ ДЛЯ ДЕПЛОЯ

### Полный редеплой:
```bash
cd /var/www/YOUR_DOMAIN && git pull origin main && npm install && npm run build && cp -r dist/public/* /home/admin/web/YOUR_DOMAIN/public_html/ && pm2 restart appname
```

### Диагностика:
```bash
# Логи
pm2 logs appname --lines 50

# Проверить headers
curl -I https://YOUR_DOMAIN/ 2>/dev/null | grep -i "cross-origin"

# Проверить статус
pm2 status

# Версия кода
cd /var/www/YOUR_DOMAIN && git log --oneline -1
```

---

## ВАЖНЫЕ ОТЛИЧИЯ ДЛЯ НОВОГО САЙТА

1. **Бренд**: Help152FZ (не упоминать исходное название)
2. **Цвета**: Изумрудная палитра (не синяя)
3. **Шрифт**: Inter
4. **Углы**: Острые или более выраженно скруглённые
5. **Структура**: Горизонтальные карточки, другой порядок секций
6. **Домен**: Использовать YOUR_DOMAIN везде в конфигах

---

## КОНТАКТЫ ДЛЯ НАСТРОЙКИ

- **Telegram бот уведомлений**: Создать нового бота через @BotFather
- **YooKassa**: Новый магазин с новыми ключами
- **SMTP**: Настроить для нового домена
- **GigaChat**: Можно использовать те же ключи (или создать новые)

---

## ЭКСПРЕСС-ПРОВЕРКА: АРХИТЕКТУРА И НАСТРОЙКА

### Как работает экспресс-проверка

1. Пользователь вводит URL сайта
2. Система загружает страницу через Playwright (headless браузер)
3. Анализирует HTML, скрипты, cookies по 9 критериям
4. Выдаёт результат в реальном времени с анимацией

### Таблица критериев (schema.ts)

```typescript
export const expressCriteria = pgTable("express_criteria", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  successMessage: varchar("success_message", { length: 255 }),
  failMessage: varchar("fail_message", { length: 255 }),
  warningMessage: varchar("warning_message", { length: 255 }),
  maxPenaltyAmount: integer("max_penalty_amount").default(0),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Стандартные 9 критериев

| key | name | maxPenaltyAmount |
|-----|------|------------------|
| https_ssl | HTTPS/SSL сертификат | 50000 |
| privacy_policy | Политика конфиденциальности | 100000 |
| consent_form | Согласие на обработку ПДн | 150000 |
| cookie_banner | Cookie-баннер | 100000 |
| foreign_resources | Иностранные ресурсы | 75000 |
| data_forms | Формы сбора данных | 100000 |
| contact_info | Контактная информация | 50000 |
| authorization | Авторизация | 100000 |
| rkn_registry | Реестр Роскомнадзора | 300000 |

### API эндпоинты

```typescript
// Публичные
POST /api/express-check              // Запуск проверки
GET  /api/express-check/:id          // Результат проверки

// Админ
GET  /api/admin/express-criteria     // Список критериев
POST /api/admin/express-criteria     // Создать критерий
PUT  /api/admin/express-criteria/:id // Обновить критерий
DELETE /api/admin/express-criteria/:id // Удалить критерий
```

### Настройка через админку

SuperAdmin → Экспресс-критерии:
- Включение/отключение критериев
- Редактирование текстов сообщений
- Изменение порядка сортировки
- Настройка сумм штрафов

---

## НАСТРОЙКА AI ПРОВАЙДЕРОВ

### Архитектура AI системы

Платформа использует 2 отдельных AI-движка:

1. **Audit Engine** - для анализа сайтов (полный аудит)
2. **Consultation AI** - для чата, справочника, Telegram бота

Каждый движок может использовать разных провайдеров!

### Провайдеры AI

| Провайдер | Для аудита | Для консультаций | Особенности |
|-----------|------------|------------------|-------------|
| GigaChat | Основной | Fallback | Требует сертификаты НУЦ Минцифры |
| YandexGPT | - | Основной | Требует folder_id и IAM token |
| OpenAI | Fallback | Опционально | Требует прокси из РФ |

### Настройка GigaChat

1. **Получить API ключ**: https://developers.sber.ru/portal/products/gigachat
2. **Скачать сертификаты НУЦ Минцифры**: https://www.gosuslugi.ru/crt
3. **Создать chain файл**:

```bash
# Структура certs/gigachat_chain.pem:
# 1. Russian Trusted Root CA
# 2. Russian Trusted Sub CA
# ВАЖНО: между сертификатами должна быть пустая строка!

-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
```

4. **Добавить секрет**:
```
GIGACHATAPIKEY=ваш_base64_ключ
```

5. **Путь к сертификатам** (в коде):
```typescript
const possiblePaths = [
  path.join(process.cwd(), "certs", "gigachat_chain.pem"),
  "/var/www/YOUR_DOMAIN/certs/gigachat_chain.pem",
];
```

### Настройка YandexGPT

1. **Создать сервисный аккаунт в Яндекс.Облаке**
2. **Получить folder_id** из консоли
3. **Получить IAM токен** или OAuth токен
4. **Добавить в настройки**:
   - consultation_ai_yandex_api_key
   - consultation_ai_yandex_folder_id
   - consultation_ai_yandex_model_uri (опционально)

### Настройка OpenAI (с прокси)

OpenAI заблокирован в РФ, нужен прокси:

```typescript
// Настройки прокси в БД (system_settings):
openai_proxy_enabled: "true"
openai_proxy_type: "http" | "socks5"
openai_proxy_host: "proxy.example.com"
openai_proxy_port: "1080"
openai_proxy_username: "user" (опционально)
openai_proxy_password: "pass" (зашифрован)

// API ключ
openai_api_key: "sk-..." (зашифрован)
```

### API для управления AI (SuperAdmin)

```typescript
// Статус провайдеров
GET  /api/superadmin/consultation-ai/status

// Сохранить настройки
POST /api/superadmin/consultation-ai/settings
Body: { primaryProvider, yandexEnabled, gigachatEnabled, openaiEnabled, useGuideKnowledge }

// Сохранить API ключ
POST /api/superadmin/consultation-ai/api-keys/:provider
Body: { apiKey, folderId?, modelUri? }

// Удалить API ключ
DELETE /api/superadmin/consultation-ai/api-keys/:provider

// Тест провайдера
POST /api/superadmin/consultation-ai/test/:provider
```

### Приоритет провайдеров (fallback)

Консультации:
```
YandexGPT (primary) → GigaChat (fallback) → OpenAI (optional)
```

Аудит сайтов:
```
GigaChat (primary) → OpenAI (fallback)
```

---

## ПАНЕЛЬ МЕНЕДЖЕРА ДОКУМЕНТОВ

### Функции менеджера

- Создание документов (ручное или через AI-генератор)
- Отправка на проверку юристу
- Доработка по замечаниям
- Отправка готового документа клиенту

### Workflow документов

```
draft → in_review → revision → approved → delivered
          ↑              ↓
          └──────────────┘
```

### Типы документов

```typescript
const documentTypes = [
  "privacy_policy",     // Политика обработки ПДн
  "consent_form",       // Согласие на обработку ПДн
  "cookie_policy",      // Cookie-политика
  "cookie_banner",      // Cookie-баннер
  "user_agreement",     // Пользовательское соглашение
  "offer",              // Оферта
  "terms_of_service",   // Условия использования
  "confidentiality",    // Политика конфиденциальности
  "other",              // Прочее
];
```

### AI Генератор документов (5 шагов)

1. **Выбор типа документа** - один или несколько
2. **Выбор AI провайдера** - GigaChat / OpenAI
3. **Данные компании** - ИНН, название, адрес (DaData автозаполнение)
4. **Данные сайта** - URL, описание деятельности
5. **Генерация** - поочередная генерация выбранных документов

### API эндпоинты менеджера

```typescript
// Документы
GET    /api/manager/documents           // Список документов
GET    /api/manager/documents/stats     // Статистика
POST   /api/manager/documents           // Создать документ
PATCH  /api/manager/documents/:id       // Обновить документ
DELETE /api/manager/documents/:id       // Удалить документ

// Действия
POST   /api/manager/documents/:id/send-to-review // На проверку
POST   /api/manager/documents/:id/deliver        // Доставлен клиенту

// AI генерация
POST   /api/manager/documents/generate  // Сгенерировать через AI
Body: { documentType, aiProvider, companyData, siteData, promptId? }

// Прокси DaData (CORS)
POST   /api/dadata/suggest-party
Body: { query: "ИНН или название" }
```

### Таблицы документов

```typescript
// Основная таблица
documents: {
  id, title, documentType, status,
  content,  // HTML/текст документа
  orderId, auditId, clientUserId,
  createdByUserId, assignedManagerId, assignedLawyerId,
  createdAt, updatedAt
}

// Версии (история)
documentVersions: {
  id, documentId, versionNumber,
  fileName, fileType, filePath, fileSize,
  uploadedByUserId, createdAt
}

// Промпты для генерации
documentPrompts: {
  id, name, documentType, promptText, isDefault
}
```

---

## ПАНЕЛЬ ЮРИСТА

### Функции юриста

- Просмотр документов на проверке
- Одобрение документа
- Возврат на доработку с комментарием
- История всех проверок

### API эндпоинты юриста

```typescript
// Документы для проверки
GET  /api/lawyer/documents              // Список (status = in_review)
GET  /api/lawyer/documents/:id          // Детали документа

// Проверка
POST /api/lawyer/documents/:id/review
Body: { decision: "approved" | "revision_needed", comment?: string }

// История проверок
GET  /api/lawyer/documents/:id/reviews
```

### Таблица проверок

```typescript
documentReviews: {
  id,
  documentId,
  versionId,
  reviewerUserId,
  decision: "approved" | "revision_needed" | "rejected",
  comment,
  createdAt
}
```

---

## ДОПОЛНИТЕЛЬНЫЕ КОМПОНЕНТЫ ДЛЯ ДОБАВЛЕНИЯ

### 1. Инструменты (Tools) - 11 платных сервисов

| Инструмент | Описание | Цена |
|------------|----------|------|
| rkn_check | Проверка в реестре РКН | 500₽ |
| privacy_generator | Генератор политики ПДн | 1500₽ |
| consent_generator | Генератор согласия | 1000₽ |
| cookie_generator | Генератор cookie-политики | 1000₽ |
| cookie_banner | Код cookie-баннера | 500₽ |
| user_agreement | Пользовательское соглашение | 2000₽ |
| offer_generator | Генератор оферты | 2500₽ |
| rkn_notification | Уведомление в РКН | 3000₽ |
| local_act | Локальный акт | 1500₽ |
| order_processing | Приказ об обработке ПДн | 1000₽ |
| full_pack | Полный пакет документов | 9900₽ |

### 2. База знаний (Guide)

- 9 разделов, 28 тем, 29+ статей
- RAG-поиск для AI консультаций
- Публичный доступ

### 3. Telegram боты

**Бот уведомлений** (@OrderXXX_bot):
- Уведомления о новых заказах
- Статусы оплат
- Разные топики форума для разных типов

**AI бот консультаций** (@help152fz_bot):
- Ответы на вопросы по ФЗ-152
- Использует тот же AI-движок консультаций

### 4. Antifraud система

- Защита от накрутки экспресс-проверок
- Fingerprinting устройств
- Velocity checks
- Блокировка headless браузеров

### 5. Конверсии и аналитика

```typescript
// Таблицы
conversionGoals: { id, name, identifier, category, value, isActive }
conversionEvents: { id, goalId, sessionId, userId, metadata, createdAt }

// API
GET  /api/superadmin/conversion-goals
POST /api/superadmin/conversion-goals
POST /api/tracking/conversion
```

### 6. OAuth авторизация

- VK
- Yandex
- (опционально Telegram)

### 7. Newsletter подписки

Интеграции:
- SendPulse
- Unisender  
- Dashamail

---

## ПОЛНЫЙ СПИСОК СТРАНИЦ SUPERADMIN

| Путь | Описание |
|------|----------|
| /superadmin | Дашборд |
| /superadmin/users | Управление пользователями |
| /superadmin/settings | Системные настройки |
| /superadmin/themes | Темы оформления |
| /superadmin/services | Пакеты услуг и цены |
| /superadmin/express-criteria | Критерии экспресс-проверки |
| /superadmin/consultation-ai | Настройки AI консультаций |
| /superadmin/payment-settings | Платёжные системы |
| /superadmin/email-settings | Email (SMTP, рассылки) |
| /superadmin/telegram-bot | Telegram боты |
| /superadmin/telegram-groups | Группы уведомлений |
| /superadmin/referral-settings | Реферальная программа |
| /superadmin/promo-codes | Промокоды |
| /superadmin/conversion-goals | Цели конверсий |
| /superadmin/oauth-settings | OAuth провайдеры |
| /superadmin/document-integrations | DaData интеграция |
| /superadmin/backup | Резервные копии |
| /superadmin/changelog | Журнал изменений |
| /superadmin/logs | Системные логи |

---

## СЕКРЕТЫ И ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Обязательные

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
SESSION_SECRET=random-64-char-hex-string
NODE_ENV=production
PORT=3001
DOMAIN=https://YOUR_DOMAIN
```

### Платежи

```env
YOOKASSA_SHOP_ID=123456
YOOKASSA_SECRET_KEY=live_xxx
# Или Robokassa
ROBOKASSA_LOGIN=xxx
ROBOKASSA_PASSWORD1=xxx
ROBOKASSA_PASSWORD2=xxx
```

### AI провайдеры

```env
GIGACHATAPIKEY=base64_encoded_key
# Или через БД (зашифрованные)
```

### Telegram

```env
TELEGRAM_BOT_TOKEN=bot_token_for_notifications
TELEGRAM_CHAT_ID=chat_or_forum_id
TELEGRAM_AI_BOT_TOKEN=bot_token_for_ai_consultations
```

### Email (SMTP)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@domain.com
SMTP_PASS=password
SMTP_FROM=noreply@domain.com
```

### DaData (автозаполнение компаний)

```env
DADATA_API_KEY=xxx
DADATA_SECRET_KEY=xxx
```

---

## SEED ДАННЫЕ (первый запуск)

После `npm run db:push` нужно заполнить:

1. **SuperAdmin пользователь**
2. **Критерии экспресс-проверки** (9 шт)
3. **Пакеты аудита** (по типам сайтов)
4. **Инструменты** (11 шт)
5. **Настройки системы** (defaults)
6. **Темы оформления** (light/dark)
7. **Статьи справочника** (guide)

Создать seed скрипт или добавить данные через админку.
