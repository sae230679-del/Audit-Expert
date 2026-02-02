# Аудит Эксперт ФЗ-152 - Интеграционный Пакет v2.0

## Обзор
Этот пакет содержит компоненты для интеграции системы проверки соответствия ФЗ-152 в проект "Аудит Эксперт ФЗ-152". Компоненты разработаны для SecureLex.ru и адаптированы для переноса.

**ВАЖНО**: При интеграции необходимо изменить визуальное оформление, названия переменных и структуру файлов, чтобы проекты выглядели по-разному.

## Что входит в пакет

### 1. Движок проверок (server/)
| Файл | Описание |
|------|----------|
| `audit-engine.ts` | Главный движок аудита с 60+ критериями проверки |
| `compliance-engine-v2.ts` | Движок комплексной проверки соответствия |
| `enhanced-detection.ts` | Расширенное определение (Playwright, cookies, CMP) |
| `hosting-checker.ts` | Проверка российского хостинга (DNS/PTR + AI WHOIS) |
| `site-type-detector.ts` | Автоопределение типа сайта (12 категорий) |
| `penalties-map.ts` | Карта штрафов КоАП РФ ст. 13.11 |
| `playwright-fetcher.ts` | Загрузчик страниц через Playwright |
| `rkn-parser.ts` | Парсер реестра РКН |
| `analytics-routes.ts` | API аналитики (пользователи, проверки, конверсии) |

### 2. Справочник ФЗ-152 (server/)
| Файл | Описание |
|------|----------|
| `guide-knowledge-service.ts` | RAG-сервис для AI с базой знаний (29 статей) |
| `ai-consultation-service.ts` | Сервис AI-консультаций (Yandex GPT, GigaChat, OpenAI) |

### 3. Документооборот (client/pages/)
| Файл | Описание |
|------|----------|
| `manager-dashboard.tsx` | Панель менеджера для создания документов |
| `lawyer-dashboard.tsx` | Панель юриста для проверки документов |

### 4. Аналитика (client/pages/)
| Файл | Описание |
|------|----------|
| `analytics.tsx` | Главная панель аналитики |
| `analytics-users.tsx` | Аналитика по пользователям |
| `analytics-express.tsx` | Аналитика экспресс-проверок |

### 5. Реферальная программа (client/pages/)
| Файл | Описание |
|------|----------|
| `referral.tsx` | Личный кабинет реферальной программы |
| `superadmin-referral-settings.tsx` | Настройки реферальной программы (superadmin) |

### 6. Схемы базы данных (shared/)
| Файл | Описание |
|------|----------|
| `schema.ts` | Полная схема (users, documents, guide_*, referrals, etc.) |
| `criteria-registry.ts` | Реестр критериев проверки |
| `referral-schema-extract.ts` | Выдержка схемы реферальной программы |
| `guide-schema-extract.ts` | Выдержка схемы справочника |
| `document-schema-extract.ts` | Выдержка схемы документооборота |

### 7. SQL данные (sql/)
| Файл | Описание |
|------|----------|
| `guide-articles-data.sql` | 29 статей справочника ФЗ-152 |

---

## Инструкции по интеграции

### Шаг 1: Подготовка окружения
```bash
# Обязательные зависимости
npm install drizzle-orm drizzle-kit pg express playwright cheerio openai bcryptjs
npm install @tanstack/react-query wouter recharts date-fns
npm install -D tsx typescript @types/node @types/express

# Установка браузера для Playwright
npx playwright install chromium
```

### Шаг 2: Настройка PostgreSQL
```bash
# Создать базу данных через инструмент Replit (кнопка Database)
# Или вручную:
createdb audit_expert
```

Переменные окружения добавятся автоматически:
- `DATABASE_URL`
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### Шаг 3: Создание таблиц БД
```bash
npm run db:push
```

Ключевые таблицы:
- `users` - пользователи с ролями
- `documents`, `document_versions`, `document_reviews` - документооборот
- `guide_sections`, `guide_topics`, `guide_articles` - справочник
- `referrals`, `referral_participants`, `referral_payouts` - рефералка
- `express_check_results`, `express_criteria` - проверки

### Шаг 4: Интеграция серверных модулей
1. Скопируйте файлы из `server/` в ваш `server/`
2. **ОБЯЗАТЕЛЬНО** переименуйте для уникальности:

| Было | Стало |
|------|-------|
| `audit-engine.ts` | `compliance-checker.ts` |
| `AuditEngine` | `ComplianceChecker` |
| `/api/express-check` | `/api/compliance-scan` |

### Шаг 5: Справочник (ВНУТРЕННИЙ)
**НЕ выводить на главную!** Использовать только:
- Для AI-анализа документов
- Для подсказок менеджерам
- Для обучения AI-движка

```typescript
import { getRelevantGuideContext } from './guide-knowledge-service';

const context = await getRelevantGuideContext(userQuestion, {
  maxTokens: 4000,
  provider: 'gigachat'
});
```

### Шаг 6: Реферальная программа
Workflow:
1. Пользователь получает реферальный код
2. Новый пользователь регистрируется с кодом
3. При оплате реферер получает % комиссии
4. Вывод средств через панель superadmin

### Шаг 7: API ключи (Secrets)
Добавить в секреты Replit:
```
YANDEX_GPT_API_KEY     - Yandex GPT (основной)
YANDEX_GPT_FOLDER_ID   - ID каталога Yandex Cloud
GIGACHAT_AUTH_KEY      - GigaChat (fallback)
OPENAI_API_KEY         - OpenAI (опционально)
SESSION_SECRET         - для сессий (любая строка 32+ символов)
```

---

## Рекомендации по дифференциации

### Визуальные различия
- Другая цветовая схема (НЕ синий!)
- Другой логотип и название
- Другая структура лендинга
- Другие иконки

### Структурные различия
| SecureLex | Audit Expert |
|-----------|--------------|
| `/api/express-check/` | `/api/compliance-scan/` |
| `express_check_results` | `compliance_scans` |
| `server/` | `src/modules/` |
| Справочник публичный | Справочник внутренний |

### Функциональные акценты
- SecureLex: фокус на экспресс-проверках для всех
- Audit Expert: фокус на документообороте для B2B

---

## TROUBLESHOOTING (Решение проблем)

### Проблема 1: Сервер не запускается
**Симптом**: `Error: Cannot find module 'xxx'`
```bash
# Решение: переустановить зависимости
rm -rf node_modules package-lock.json
npm install
```

### Проблема 2: База данных не подключается
**Симптом**: `ECONNREFUSED` или `connection refused`
```bash
# Решение 1: Проверить что PostgreSQL запущена
# В Replit: создать Database через панель

# Решение 2: Проверить DATABASE_URL
echo $DATABASE_URL
```

### Проблема 3: Playwright не работает
**Симптом**: `browserType.launch: Executable doesn't exist`
```bash
# Решение: установить браузер
npx playwright install chromium

# Если не помогло:
npx playwright install-deps
```

### Проблема 4: Session/Cookie проблемы
**Симптом**: Пользователь не авторизуется, сессии не сохраняются
```typescript
// Решение: проверить настройки cookie в app.ts
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));
```

### Проблема 5: Автозаполнение браузера ломает поиск
**Симптом**: В поле поиска появляется email пользователя
```tsx
// Решение: добавить атрибуты к input
<input
  type="search"
  name="unique_search_field_name"
  autoComplete="new-password"
  autoCorrect="off"
  data-lpignore="true"
/>
```

### Проблема 6: Фронтенд не видит API
**Симптом**: `CORS error` или `Failed to fetch`
```typescript
// Решение: добавить CORS middleware
import cors from 'cors';
app.use(cors({
  origin: true,
  credentials: true
}));
```

### Проблема 7: Vite HMR не работает в iframe
**Симптом**: Сайт не обновляется в превью Replit
```typescript
// vite.config.ts - добавить:
server: {
  host: '0.0.0.0',
  port: 5000,
  hmr: {
    clientPort: 443
  },
  allowedHosts: true
}
```

### Проблема 8: Drizzle миграции ломаются
**Симптом**: `ALTER TABLE ... failed`
```bash
# НИКОГДА не меняй тип ID колонок!
# Решение:
npm run db:push --force
```

### Проблема 9: AI провайдеры не отвечают
**Симптом**: Timeout или 401/403 ошибки
```typescript
// Решение: проверить ключи и использовать fallback
const providers = ['yandex', 'gigachat', 'openai'];
for (const provider of providers) {
  try {
    return await callAI(provider, prompt);
  } catch (e) {
    console.log(`[AI] ${provider} failed, trying next...`);
  }
}
```

### Проблема 10: PDF генерация падает
**Симптом**: `Error: pdfkit failed`
```bash
# Решение: установить шрифты
npm install pdfkit

# Использовать встроенные шрифты или Base64
```

---

## Контрольный список интеграции

### База и сервер
- [ ] PostgreSQL подключена (DATABASE_URL)
- [ ] Таблицы созданы (`npm run db:push`)
- [ ] API ключи добавлены в Secrets
- [ ] Playwright установлен (`npx playwright install chromium`)

### Модули
- [ ] Движок проверок работает
- [ ] Справочник работает (внутренний!)
- [ ] Документооборот работает
- [ ] Реферальная программа работает
- [ ] Аналитика работает

### Дифференциация
- [ ] Названия файлов/функций изменены
- [ ] Endpoints переименованы
- [ ] Визуальное оформление другое
- [ ] Логотип и брендинг другой

---

## Роли пользователей

| Роль | Доступ |
|------|--------|
| `user` | Личный кабинет, проверки, документы |
| `manager` | + Создание документов, работа с клиентами |
| `lawyer` | + Проверка и одобрение документов |
| `admin` | + Аналитика, управление контентом |
| `superadmin` | + Полный доступ, настройки, рефералка |

---

## Быстрый старт для агента

Когда пользователь скажет "интегрируй", выполни:

1. Распакуй архив: `tar -xzvf audit-expert-integration.tar.gz`
2. Прочитай этот файл полностью
3. Создай PostgreSQL через панель Replit
4. Скопируй схемы в `shared/schema.ts`
5. Запусти `npm run db:push`
6. Скопируй серверные модули, **ПЕРЕИМЕНУЙ ИХ**
7. Добавь routes в основной роутер
8. Скопируй страницы клиента
9. Добавь секреты AI
10. Проверь работу всех модулей

---
Пакет подготовлен: Январь 2026
Версия: 2.0
Включает: проверки, документооборот, справочник, аналитику, реферальную программу
