# Session Context - 21 января 2026

## ПОЛНЫЙ АНАЛИЗ ОШИБОК ЗА 12 ЧАСОВ (30 января 2026)

### Обзор
12 часов работы, ~100+ ошибок. Задачи: личный кабинет пользователя, панель работы с клиентами (реферальная система), Document Manager. Ниже ВСЕ ошибки с анализом.

---

# ЧАСТЬ 1: ЛИЧНЫЙ КАБИНЕТ И ПАНЕЛЬ КЛИЕНТОВ

---

## ОШИБКА #6: Добавление клиента - email не верифицируется

**Симптом:** При добавлении клиента через реферальную панель, он не мог войти - email не подтверждён.

**Неправильные попытки:**
1. Добавлял отправку письма подтверждения
2. Пытался сделать кнопку "Подтвердить email"

**Почему не работало:** Лишняя сложность. Если партнёр сам добавляет клиента, значит он уже проверил что email правильный.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/routes.ts - при добавлении клиента партнёром
await storage.updateUser(newUser.id, { 
  isEmailVerified: true  // Автоматически подтверждать!
});
```

**Как найти быстрее:** Задать вопрос: "Нужна ли верификация email если клиента добавляет доверенное лицо (партнёр)?"

---

## ОШИБКА #7: URL сайта не нормализуется

**Симптом:** Пользователь вводил `www.site.ru`, `http://site.ru`, `site.ru/` - в БД сохранялись разные значения.

**Неправильные попытки:**
1. Валидация на фронтенде (обходится)
2. Regex замена только `www.`

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
function normalizeWebsiteUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  // Удалить протокол
  normalized = normalized.replace(/^https?:\/\//, '');
  // Удалить www.
  normalized = normalized.replace(/^www\./, '');
  // Удалить trailing slash
  normalized = normalized.replace(/\/+$/, '');
  return normalized;
}
```

**Как найти быстрее:** ВСЕГДА нормализовать пользовательский ввод на БЭКЕНДЕ. Фронтенд - только для UX.

---

## ОШИБКА #8: Маскировка email клиентов

**Симптом:** В списке клиентов партнёр видел полные email - это нарушение приватности.

**Неправильные попытки:**
1. Маскировка на фронтенде (данные всё равно приходят полные)

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/routes.ts - в API endpoint
const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
// "ivan@mail.ru" → "iv***@mail.ru"
```

**Как найти быстрее:** Чувствительные данные маскировать НА БЭКЕНДЕ, не отдавать полные данные фронтенду.

---

## ОШИБКА #9: Пробелы в email/телефоне с мобильных

**Симптом:** Автозаполнение на мобильных добавляло пробелы в email и телефон.

**Неправильные попытки:**
1. CSS `text-transform`
2. Валидация "нет пробелов" (ломает UX)

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// Trim ВСЕ строковые поля перед отправкой
const cleanData = {
  email: formData.email.trim(),
  phone: formData.phone.trim().replace(/\s+/g, ''),
  name: formData.name.trim(),
};
```

**Как найти быстрее:** ВСЕГДА применять `.trim()` к строковому пользовательскому вводу.

---

## ОШИБКА #10: Дублирование email при регистрации клиента

**Симптом:** Можно было добавить клиента с email который уже существует.

**Неправильные попытки:**
1. Проверка на фронтенде перед отправкой

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/routes.ts
const existingUser = await storage.getUserByEmail(email);
if (existingUser) {
  return res.status(400).json({ error: "Пользователь с таким email уже существует" });
}
```

**Как найти быстрее:** Уникальность ВСЕГДА проверять на бэкенде + UNIQUE constraint в БД.

---

## ОШИБКА #11: req.user undefined в API routes

**Симптом:** После авторизации `req.user` был undefined в защищённых маршрутах.

**Неправильные попытки:**
1. Проверял сессию - сессия есть
2. Добавлял console.log везде
3. Искал ошибку в middleware порядке

**Почему не работало:** Express middleware `requireAuth` проверял сессию, но НЕ прикреплял user к request.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/middleware/auth.ts
export const requireAuth = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Не авторизован" });
  }
  
  // КРИТИЧЕСКИ ВАЖНО: прикрепить user к request!
  const user = await storage.getUser(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "Пользователь не найден" });
  }
  
  req.user = user;  // ← ЭТО БЫЛО ПРОПУЩЕНО!
  next();
};
```

**Как найти быстрее:** При 401/403 ошибках - СНАЧАЛА проверить middleware, потом route.

---

## ОШИБКА #12: Rate limiting на сброс пароля

**Симптом:** Можно было спамить запросы на сброс пароля.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.post("/api/auth/forgot-password", (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (limit && limit.resetAt > now && limit.count >= 3) {
    return res.status(429).json({ error: "Слишком много запросов" });
  }
  
  // ... обработка запроса
  
  rateLimitMap.set(ip, {
    count: (limit?.count || 0) + 1,
    resetAt: now + 60 * 60 * 1000  // 1 час
  });
});
```

---

## ОШИБКА #13: iCloud почта не получала письма

**Симптом:** Письма на @icloud.com, @me.com не доходили.

**Неправильные попытки:**
1. Менял SMTP сервер
2. Проверял спам-фильтры

**Почему не работало:** Apple требует строгие заголовки: Message-ID, Date, правильный From.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
const mailOptions = {
  from: '"SecureLex" <noreply@securelex.ru>',
  to: email,
  subject: "Тема",
  html: content,
  headers: {
    'Message-ID': `<${Date.now()}.${Math.random().toString(36)}@securelex.ru>`,
    'Date': new Date().toUTCString(),
    'X-Priority': '3',
    'X-Mailer': 'SecureLex Mailer'
  }
};
```

**Как найти быстрее:** Проверить требования почтового провайдера к заголовкам.

---

# ЧАСТЬ 2: DOCUMENT MANAGER

---

## ОШИБКА #1: Checkbox не кликабельны по всей строке

**Симптом:** Пользователь должен был точно попасть в маленький квадратик checkbox.

**Неправильные попытки:**
1. Добавлял onClick на div-контейнер
2. Использовал CSS `cursor: pointer` (косметика, не решает проблему)
3. Пытался сделать checkbox шире через CSS

**Почему не работало:** onClick на div работал, но конфликтовал с Checkbox onChange. Кликая по div, вызывался onClick div-а, а потом браузер пытался вызвать onChange checkbox-а - они мешали друг другу.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
<label htmlFor={`doc-${doc.id}`} className="flex items-center gap-3 cursor-pointer">
  <Checkbox id={`doc-${doc.id}`} ... />
  <span>Текст</span>
</label>
```
**Почему работает:** HTML `<label htmlFor="id">` нативно связывает клик по любой части label с input/checkbox. Нет конфликтов, браузерное поведение.

**Как найти быстрее:** Поискать "checkbox clickable row react" - первый результат даст `<label>`.

---

### ОШИБКА #2: onComplete вызывался после КАЖДОГО документа

**Симптом:** При генерации 3 документов wizard закрывался после первого.

**Неправильные попытки:**
1. Добавлял флаги `isComplete` в state
2. Пытался считать количество завершённых mutations
3. Использовал useEffect с зависимостью на mutation.isSuccess

**Почему не работало:** 
```tsx
const mutation = useMutation({
  onSuccess: () => {
    onComplete(data.document.id); // Вызывается КАЖДЫЙ раз!
  }
});
```
При вызове `mutation.mutateAsync()` в цикле, `onSuccess` срабатывает после КАЖДОГО успешного запроса.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
// Убрать onSuccess из mutation
const mutation = useMutation({ mutationFn: ... });

// Управлять вручную
const handleGenerate = async () => {
  let lastDocId = null;
  for (const doc of docs) {
    const result = await mutation.mutateAsync(doc);
    lastDocId = result.document.id;
  }
  // Вызывать ТОЛЬКО после всех
  onComplete(lastDocId);
};
```

**Как найти быстрее:** Прочитать документацию TanStack Query о разнице между `onSuccess` в mutation config vs ручное управление с `mutateAsync`. Ключевой вопрос: "Когда я хочу чтобы callback сработал - после каждой мутации или после всей серии?"

---

### ОШИБКА #3: YandexGPT не добавлен в enum

**Симптом:** После добавления YandexGPT, при выборе этого провайдера - 500 ошибка.

**Неправильные попытки:**
1. Искал ошибку в API route
2. Проверял токены Yandex
3. Добавлял console.log везде

**Почему не работало:** В `shared/schema.ts` enum `aiProviderEnum` содержал только `["gigachat", "openai"]`. При INSERT в БД значение `yandexgpt` отклонялось PostgreSQL.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// shared/schema.ts
export const aiProviderEnum = pgEnum("ai_provider", [
  "gigachat", 
  "openai", 
  "yandexgpt"  // ← Добавить!
]);
```
+ Миграция БД: `ALTER TYPE ai_provider ADD VALUE 'yandexgpt';`

**Как найти быстрее:** 
1. Когда добавляешь новое значение для выбора - СРАЗУ искать где определён тип/enum
2. Команда: `grep -r "aiProvider" --include="*.ts" | grep enum`

---

### ОШИБКА #4: Прогресс не показывался при генерации

**Симптом:** Пользователь видел только spinner, не понимал сколько документов готово.

**Неправильные попытки:**
1. Использовал mutation.isPending (true/false, без прогресса)
2. Пытался считать по mutation.data (сбрасывается)

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
const [progress, setProgress] = useState({ current: 0, total: 0 });

const handleGenerate = async () => {
  const total = docs.length * providers.length;
  setProgress({ current: 0, total });
  
  let current = 0;
  for (...) {
    await mutation.mutateAsync(...);
    current++;
    setProgress({ current, total });
  }
};
```

**Как найти быстрее:** Понять что mutation - это про ОДНУ операцию. Для серии операций нужен ВНЕШНИЙ state.

---

### ОШИБКА #5: Можно было снять ВСЕ провайдеры

**Симптом:** Пользователь снимал все checkbox-ы и нажимал "Далее" - кнопка disabled, но неясно почему.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
const toggleProvider = (provider: string) => {
  setSelectedProviders(prev => {
    if (prev.includes(provider)) {
      // НЕ ДАВАТЬ снять последний!
      if (prev.length === 1) return prev;
      return prev.filter(p => p !== provider);
    }
    return [...prev, provider];
  });
};
```

---

# ЧАСТЬ 3: DaData ИНТЕГРАЦИЯ И AI СЕРВИСЫ

---

## ОШИБКА #14: DaData API не работает - CORS

**Симптом:** Фронтенд не мог вызвать DaData API напрямую.

**Неправильные попытки:**
1. Добавлял headers на фронтенде
2. Пытался использовать fetch mode: 'no-cors'

**Почему не работало:** DaData API не поддерживает CORS для браузерных запросов. Нужен прокси через бэкенд.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/routes.ts - прокси endpoint
app.post("/api/dadata/suggest-party", requireAuth, async (req, res) => {
  const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Token ${process.env.DADATA_API_KEY}`,
    },
    body: JSON.stringify(req.body),
  });
  const data = await response.json();
  res.json(data);
});
```

**Как найти быстрее:** Внешние API без CORS → ВСЕГДА прокси через бэкенд.

---

## ОШИБКА #15: DaData ключ в коде

**Симптом:** API ключ был захардкожен в коде.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// 1. Добавить в secrets: DADATA_API_KEY
// 2. Использовать process.env
const apiKey = process.env.DADATA_API_KEY;
```

**Как найти быстрее:** НИКОГДА не хардкодить ключи. ВСЕГДА env/secrets.

---

## ОШИБКА #16: GigaChat сертификат "bad end line"

**Симптом:** Ошибка SSL при вызове GigaChat API.

**Неправильные попытки:**
1. Перекачивал сертификат
2. Менял формат файла

**Почему не работало:** Файл сертификата не имел перевода строки в конце.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```bash
echo "" >> certs/gigachat_chain.pem
```

**Как найти быстрее:** "bad end line" = добавить пустую строку в конец PEM файла.

---

## ОШИБКА #17: Playwright браузеры не установлены

**Симптом:** `Failed to launch browser: Executable doesn't exist`

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```bash
npx playwright install chromium
```

**Как найти быстрее:** Playwright требует отдельной установки браузеров после npm install.

---

## ОШИБКА #18: dist/public/index.html не существует

**Симптом:** ENOENT ошибка при старте сервера.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```bash
npm run build  # Пересобрать проект
# или создать папку:
mkdir -p dist/public
```

**Как найти быстрее:** После git pull ВСЕГДА запускать npm run build.

---

# ЧАСТЬ 4: ДЕПЛОЙ И ПРОДАКШЕН

---

## ОШИБКА #19: Изменения не попали на GitHub

**Симптом:** После git pull на сервере - старый код.

**Неправильные попытки:**
1. Повторный git pull
2. Проверка коммитов на сервере

**Почему не работало:** Replit не запушил автоматически. Нужен явный push.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```bash
# В Replit Shell:
git add -A && git commit -m "message" && git push origin main

# На сервере:
git fetch origin && git reset --hard origin/main
```

**Как найти быстрее:** ВСЕГДА проверять что коммит на origin/main: `git log --oneline origin/main -1`

---

## ОШИБКА #20: PM2 не перезапустился

**Симптом:** Старый код работает после git pull.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```bash
npm run build && pm2 restart securelex
```

**Как найти быстрее:** После обновления кода ВСЕГДА: build → restart.

---

## ОШИБКА #21: Миграция enum не применена

**Симптом:** При добавлении нового значения в enum - 500 ошибка.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```sql
ALTER TYPE ai_provider ADD VALUE 'yandexgpt';
```

**Как найти быстрее:** Drizzle схема ≠ БД схема. Enum в PostgreSQL нужно менять вручную.

---

# ЧАСТЬ 5: TYPESCRIPT И ТИПЫ

---

## ОШИБКА #22: LSP ошибки в routes.ts

**Симптом:** 35 LSP ошибок в server/routes.ts

**Неправильные попытки:**
1. Игнорировал ошибки
2. Добавлял any типы везде

**Почему не работало:** TypeScript не знал что req.user существует после requireAuth.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// server/types.ts
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

**Как найти быстрее:** Расширение типов Express через module augmentation.

---

## ОШИБКА #23: Несовпадение типов insert/select

**Симптом:** TypeScript ругался на передаваемые данные.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```typescript
// shared/schema.ts
export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
```

**Как найти быстрее:** Использовать drizzle-zod для генерации схем.

---

# ЧАСТЬ 6: UI/UX ОШИБКИ

---

## ОШИБКА #24: Модальное окно закрывалось само

**Симптом:** При клике внутри модалки она закрывалась.

**Неправильные попытки:**
1. e.stopPropagation() везде
2. Убирал onClose

**Почему не работало:** Event bubbling - клик по контенту доходил до overlay.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
<div className="overlay" onClick={onClose}>
  <div className="content" onClick={(e) => e.stopPropagation()}>
    {children}
  </div>
</div>
```

**Как найти быстрее:** stopPropagation на КОНТЕЙНЕРЕ контента, не на каждом элементе.

---

## ОШИБКА #25: Toast не показывался

**Симптом:** После мутации toast не появлялся.

**Неправильные попытки:**
1. Проверял импорт toast
2. Добавлял console.log

**Почему не работало:** Toaster компонент не был добавлен в App.tsx.

**ПРАВИЛЬНОЕ РЕШЕНИЕ:**
```tsx
// App.tsx
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <>
      {/* ... приложение */}
      <Toaster />  {/* ← ОБЯЗАТЕЛЬНО в конце! */}
    </>
  );
}
```

**Как найти быстрее:** Проверить что Toaster добавлен в корень приложения.

---

## ГЛАВНЫЕ ВЫВОДЫ: Как не тратить 4 часа на отладку

### 1. ЧИТАЙ ДОКУМЕНТАЦИЮ ПЕРЕД КОДОМ
- TanStack Query: onSuccess в config vs в mutateAsync options
- HTML: <label htmlFor> для кликабельных областей
- PostgreSQL: ENUM типы и ALTER TYPE

### 2. ЗАДАВАЙ ПРАВИЛЬНЫЕ ВОПРОСЫ
| Плохой вопрос | Хороший вопрос |
|---------------|----------------|
| "Почему не работает?" | "На каком ЭТАПЕ ломается?" |
| "Где ошибка?" | "Какой тип данных ожидается vs приходит?" |
| "Как починить?" | "Как это ДОЛЖНО работать по документации?" |

### 3. ПРОВЕРЯЙ ГРАНИЦЫ СИСТЕМЫ
Когда добавляешь новое значение (yandexgpt):
1. Frontend select/checkbox - ✓
2. Типы TypeScript - ?
3. Схема БД (enum) - ?
4. API валидация - ?

### 4. НЕ ПОЛАГАЙСЯ НА ОНЛАЙН РЕШЕНИЯ
React/TanStack Query меняются. Код из Stack Overflow может быть для v3, а у тебя v5.

### 5. ИЗОЛИРУЙ ПРОБЛЕМУ
```bash
# Вместо "не работает"
# Проверь каждый слой отдельно:

# 1. База данных принимает значение?
psql -c "SELECT enum_range(NULL::ai_provider);"

# 2. API возвращает что ожидается?
curl -X POST /api/... | jq

# 3. Frontend получает данные?
console.log(mutation.data);
```

---

## ЗОЛОТЫЕ ПРАВИЛА (ЧИТАЙ КАЖДУЮ СЕССИЮ!)

### Правило 1: ПРОДАКШЕН - ГЛАВНЫЙ
- **Основной сайт:** https://securelex.ru (сервер 77.222.46.145)
- Replit = среда разработки, НЕ основной сайт
- ВСЕ проверки делать на продакшене
- Не говорить "исправлено" пока не проверено на securelex.ru

### Правило 2: СНАЧАЛА ЗАГОЛОВКИ, ПОТОМ КОД
При любой проблеме с iframe/встраиванием:
```bash
curl -I https://securelex.ru/ | grep -iE "frame|origin|embed|security"
```
Это сэкономит ДНИ отладки!

### Правило 3: ОДНА ПРОБЛЕМА = ОДИН КОММИТ
Не смешивать исправления. Каждое изменение отдельно проверять.

### Правило 4: ДАВАТЬ ГОТОВЫЕ КОМАНДЫ
Вместо "проверьте логи" давать:
```bash
pm2 logs securelex --lines 50 --err
```

### Правило 5: КОМАНДЫ ДЛЯ ДЕПЛОЯ ВСЕГДА ПОЛНЫЕ
```bash
cd /var/www/securelex.ru && git pull origin main && npm run build && pm2 restart securelex
```

---

## ОБЯЗАТЕЛЬНОЕ ПРАВИЛО ТЕСТИРОВАНИЯ (КРИТИЧЕСКОЕ!)

**ПЕРЕД ТЕМ КАК ОБЪЯВИТЬ ЧТО-ТО ИСПРАВЛЕННЫМ:**

1. **Искать ошибки минимум 10 раз, тремя разными способами:**
   - grep по логам
   - поиск в коде
   - проверка API эндпоинтов
   - проверка базы данных
   - проверка фронтенда
   
2. **Проверять структуру:**
   - Все таблицы в БД существуют
   - Все миграции применены
   - Все API маршруты доступны
   
3. **ПРИОРИТЕТ - ПРОДАКШЕН СЕРВЕР:**
   - Replit = внутренняя разработка
   - Продакшен = securelex.ru = 77.222.46.145
   - Проверять на продакшене после каждого изменения
   - Не говорить "исправлено" пока не проверено на продакшене
   
4. **НЕ останавливаться на одной найденной ошибке:**
   - Искать ВСЕ ошибки сразу
   - Их могут быть сотни

---

## ПРОТОКОЛ ПРОВЕРКИ ПЕРЕД ДЕПЛОЕМ

**ОБЯЗАТЕЛЬНО проверять перед тем как говорить пользователю деплоить:**

1. **Проверить что код изменён локально:**
   ```bash
   grep -n "ключевая_функция" файл.ts
   ```

2. **Проверить что коммит создан:**
   ```bash
   git log --oneline -1
   ```

3. **Проверить что коммит запушен на GitHub:**
   ```bash
   git log --oneline origin/main -1
   ```

4. **Убедиться что хэши совпадают** - локальный и origin/main должны быть одинаковые

5. **Тестировать API локально перед деплоем:**
   ```bash
   curl -X POST http://localhost:5000/api/endpoint -H "Content-Type: application/json" -d '{...}'
   ```

---

## Проблема 1: Антифрод API возвращает 500 (КРИТИЧЕСКАЯ)

### Симптомы
- `/api/antifraud/track` возвращает `{"error":"Tracking error"}`
- В логах: `null value in column "session_id" of relation "click_events" violates not-null constraint`
- Таблица `click_events` пустая

### Причина 1: sendBeacon отправляет неправильный Content-Type
`navigator.sendBeacon()` с `JSON.stringify(payload)` отправляет как `text/plain`, Express не парсит JSON.

### Причина 2: Сервер не генерирует session_id
Если клиент не передал `session_id`, сервер пытался вставить NULL в NOT NULL колонку.

### Решение

**Файл: `client/src/lib/antifraud-shield.ts`**
```typescript
if (navigator.sendBeacon) {
  const blob = new Blob([jsonBody], { type: 'application/json' });
  navigator.sendBeacon('/api/antifraud/track', blob);
}
```

**Файл: `server/antifraud-service.ts`**
```typescript
private generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async recordClick(payload, ipAddress, analysis) {
  const sessionId = payload.session_id || this.generateSessionId();
  // ...
}
```

### Проверка на сервере
```bash
curl -X POST https://securelex.ru/api/antifraud/track \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","page_url":"/test"}'
# Должен вернуть: {"status":"legitimate","blocked":false}

psql "postgresql://..." -c "SELECT COUNT(*) FROM click_events;"
# Должен показать количество кликов > 0
```

---

## Проблема 2: Антифрод компонент не инициализировался

### Симптомы
- Класс `ClickfraudShield` определён но не вызывается
- В консоли нет `[Antifraud] ClickfraudShield initialized`

### Решение
**Файл: `client/src/components/antifraud.tsx`**
```typescript
useEffect(() => {
  initClickfraudShield({ debugMode: false });
  
  const timer = setTimeout(() => {
    const shield = getShield();
    if (shield) {
      shield.reportClick();
    }
  }, 2000);

  const handleUnload = () => {
    const shield = getShield();
    if (shield) {
      shield.reportClick();
    }
  };
  
  window.addEventListener('beforeunload', handleUnload);
  
  return () => {
    clearTimeout(timer);
    window.removeEventListener('beforeunload', handleUnload);
  };
}, []);
```

---

## Проблема 3: Яндекс Метрика не может загрузить сайт в iframe

### Симптомы
- В Яндекс Метрике нельзя выделить кнопки для целей
- Сайт не загружается в iframe Яндекса

### Причина
CSP `frame-ancestors` не включал wildcard домены Яндекса и домен Директа.

### Решение
**Файл: `server/app.ts`** - добавить в CSP все домены Яндекса:
```typescript
frameAncestors: [
  "'self'",
  "https://metrika.yandex.ru",
  "https://metrika.yandex.com", 
  "https://webvisor.com",
  "https://webvisor2.com",
  "https://*.yandex.ru",      // WILDCARD - покрывает все поддомены
  "https://*.yandex.com",     // WILDCARD
  "https://yandex.ru",
  "https://yandex.com",
  "https://direct.yandex.ru", // Для Яндекс Директ
  "https://direct.yandex.com"
]
```

### Проверка
```bash
curl -I https://securelex.ru 2>&1 | grep -i "content-security-policy"
```

---

## Яндекс Метрика: Цели через JavaScript-события

### Автоматическое отслеживание (уже работает)

| Идентификатор цели | Что отслеживает |
|---|---|
| `contact_form_submit` | Отправка формы обратной связи |
| `order_form_submit` | Отправка формы заказа аудита |
| `order_button_click` | Клик "Заказать/Купить/Оформить" |
| `audit_button_click` | Клик "Проверить/Аудит" |
| `express_check_start` | Клик "Экспресс-проверка" |
| `payment_button_click` | Клик "Оплатить/Перейти к оплате" |
| `phone_click` | Клик по телефону |
| `email_click` | Клик по email |
| `telegram_click` | Клик по Telegram-ссылке |

### Явное указание целей через data-атрибуты

```html
<!-- Простая цель -->
<button data-goal="custom_goal_name">Кнопка</button>

<!-- С параметрами -->
<button 
  data-goal="order_premium" 
  data-goal-params='{"package":"premium","price":5000}'>
  Заказать Premium
</button>
```

### Настройка в Яндекс Метрике

1. **Настройка → Цели → Добавить цель**
2. Выбрать **"JavaScript-событие"**
3. Ввести идентификатор (например `order_button_click`)
4. Сохранить

### Проверка целей

```javascript
// В консоли браузера, добавить ?_ym_debug=2 к URL
// При клике по кнопке увидите:
// Reach goal. Counter: XXXXXX. Goal id: order_button_click
```

---

## Проблема 4: Фикс не попал в коммит

### Симптомы
- Код изменён локально в Replit
- На сервере после git pull код старый
- grep не находит новый код

### Причина
Replit автоматически откатил изменения или коммит не включил файл.

### Решение
1. Проверить что код есть локально: `grep -n "функция" файл.ts`
2. Проверить коммит: `git log --oneline -1`
3. Проверить origin: `git log --oneline origin/main -1`
4. Если хэши разные - изменения не запушены

---

## Команды для деплоя на сервер

```bash
cd /var/www/securelex.ru

# Обновить код
git fetch origin
git reset --hard origin/main

# Проверить что фикс есть
grep -n "generateSessionId" server/antifraud-service.ts

# Пересобрать и перезапустить
npm run build
pm2 restart securelex

# Проверить логи
pm2 logs securelex --lines 30

# Тест API
curl -X POST https://securelex.ru/api/antifraud/track \
  -H "Content-Type: application/json" \
  -d '{"device_id":"test","page_url":"/test"}'
```

---

## Важные файлы

- `server/antifraud-service.ts` - серверная логика антифрода
- `client/src/lib/antifraud-shield.ts` - клиентский сбор данных
- `client/src/components/antifraud.tsx` - React компонент инициализации
- `server/app.ts` - настройки CSP и безопасности
- `server/routes.ts` - API endpoints
- `client/public/robots.txt` - статический robots.txt для Яндекс.Вебмастера

---

## Проблема 5: robots.txt возвращает 404

### Симптомы
- Яндекс Вебмастер сообщает что robots.txt не найден
- curl https://securelex.ru/robots.txt возвращает HTML 404

### Причина (ДВОЙНАЯ ПРОБЛЕМА)
1. **HestiaCP архитектура:** Статические файлы ищутся в `/home/admin/web/securelex.ru/public_html/` ДО проксирования на Node.js. Динамический маршрут `/robots.txt` не срабатывает.

2. **Vite не копирует из client/public в dist/public:** Хотя мы создали `client/public/robots.txt`, при сборке на сервере этот файл не попал в `dist/public/`, потому что:
   - Файл был добавлен в Replit но не запушен на GitHub, ИЛИ
   - Vite кеширует список файлов и не видит новые файлы без пересборки с нуля

### Решение (ОБЯЗАТЕЛЬНОЕ)
**Создать robots.txt вручную на сервере:**

```bash
cat > /home/admin/web/securelex.ru/public_html/robots.txt << 'EOF'
User-agent: Yandex
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /auth
Disallow: /payment
Disallow: /manager
Disallow: /lawyer

User-agent: YandexBot
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /auth
Disallow: /payment
Disallow: /manager
Disallow: /lawyer

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /auth
Disallow: /payment
Disallow: /manager
Disallow: /lawyer

User-agent: *
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/
Disallow: /dashboard
Disallow: /profile
Disallow: /auth
Disallow: /payment
Disallow: /manager
Disallow: /lawyer

Host: https://securelex.ru
Sitemap: https://securelex.ru/sitemap.xml
EOF
```

### Почему Vite не копировал robots.txt
При `npm run build` Vite копирует файлы из `client/public/` в `dist/public/`. Но:
- Если `client/public/robots.txt` не был в git на момент `git pull` - его нет на сервере
- Replit создает файлы, но они попадают на GitHub только после push
- На сервере после `git pull` файла нет = Vite не копирует = `cp dist/public/*` не включает robots.txt

### Правильный порядок деплоя
```bash
cd /var/www/securelex.ru
git pull origin main
npm install
npm run build
cp -r dist/public/* /home/admin/web/securelex.ru/public_html/

# ВАЖНО: Проверить что robots.txt есть
ls -la /home/admin/web/securelex.ru/public_html/robots.txt
# Если нет - создать вручную командой выше

pm2 restart securelex
```

### Проверка
```bash
curl https://securelex.ru/robots.txt
# Должен вернуть содержимое robots.txt, а не HTML 404
```

### Статус: РЕШЕНО 21.01.2026
robots.txt создан вручную и работает.

---

## ПОЛНАЯ ИНСТРУКЦИЯ ДЕПЛОЯ НА ПРОДАКШЕН (21.01.2026)

### Что было исправлено в Replit:

1. **Antifraud система**
   - `client/src/lib/antifraud-shield.ts` - sendBeacon теперь использует Blob с `application/json`
   - `server/app.ts` - добавлен парсинг `text/plain` как backup для старых клиентов

2. **CSP для Яндекс.Метрики**
   - `server/app.ts` - `frameAncestors` включает все домены Яндекса
   - `xFrameOptions: false` - отключен X-Frame-Options

3. **5-ролевая система**
   - `server/middleware/auth.ts` - middleware для manager, lawyer, admin, superadmin
   - Роли: user, manager, lawyer, admin, superadmin

### Команды для деплоя на сервер:

```bash
# 1. Подключиться к серверу
ssh root@77.222.46.145

# 2. Перейти в директорию проекта
cd /var/www/securelex.ru

# 3. Получить последние изменения
git pull origin main

# 4. Установить зависимости
npm install

# 5. Собрать проект
npm run build

# 6. Копировать статические файлы
cp -r dist/public/* /home/admin/web/securelex.ru/public_html/

# 7. Создать robots.txt если нет
ls -la /home/admin/web/securelex.ru/public_html/robots.txt || cat > /home/admin/web/securelex.ru/public_html/robots.txt << 'EOF'
User-agent: Yandex
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/

User-agent: *
Allow: /
Disallow: /admin
Disallow: /superadmin
Disallow: /api/

Host: https://securelex.ru
Sitemap: https://securelex.ru/sitemap.xml
EOF

# 8. Перезапустить приложение
pm2 restart securelex

# 9. Проверить статус
pm2 status
```

### ОБЯЗАТЕЛЬНЫЕ ПРОВЕРКИ после деплоя:

```bash
# 1. Проверить robots.txt
curl https://securelex.ru/robots.txt | head -10

# 2. Проверить CSP заголовки (frame-ancestors должен быть)
curl -I https://securelex.ru 2>/dev/null | grep -i content-security-policy | grep frame-ancestors

# 3. Проверить antifraud API
curl -X POST https://securelex.ru/api/antifraud/track \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","device_id":"test"}'
# Должен вернуть: {"status":"legitimate","blocked":false} или похожее

# 4. Проверить логи на ошибки
pm2 logs securelex --lines 50 | grep -i error

# 5. Проверить что X-Frame-Options НЕТ
curl -I https://securelex.ru 2>/dev/null | grep -i x-frame-options
# Должно быть пусто!

# 6. Проверить роли пользователей в БД
psql -U securelex -d securelex -c "SELECT email, role FROM users ORDER BY role;"
```

### Если Яндекс.Метрика всё ещё не работает:

Убедиться что в ответе сервера:
1. НЕТ заголовка `X-Frame-Options`
2. ЕСТЬ `frame-ancestors` в CSP с доменами Яндекса

Если заголовки неправильные - значит старая версия кода, повторить деплой.

---

## Структура сервера (HestiaCP)

- **Путь к проекту:** `/var/www/securelex.ru`
- **Путь к public_html:** `/home/admin/web/securelex.ru/public_html/`
- **PM2 процесс:** `securelex`
- **IP сервера:** 77-222-46-145

---

## Проблема 6: Яндекс.Метрика не подсвечивает элементы для целей (КРИТИЧЕСКАЯ)

### Дата: 21 января 2026
### Время на решение: ~2 дня (из-за неправильного подхода к отладке)

### Симптомы
- В Яндекс.Метрике при создании цели "Клик по кнопке" нельзя выбрать элемент
- Сообщение "Ошибка при загрузке страницы"
- Страница не загружается в iframe визуального редактора Яндекса

### Путь к решению (НЕПРАВИЛЬНЫЙ - что делали 2 дня):

1. **День 1-2: Ходили по кругу с базой данных**
   - Думали что проблема в API `/api/conversion/goals` который возвращал 500
   - Добавляли колонки в таблицу `conversion_goals` по одной
   - После каждой колонки сервер перезапускался, появлялась новая ошибка о следующей колонке
   - Это была ОТВЛЕКАЮЩАЯ проблема - API ошибки не блокировали iframe

2. **Неправильные гипотезы:**
   - CSP `frame-ancestors` - добавили все домены Яндекса ✓ (это было нужно)
   - Колонки в БД - добавили все ✓ (это было нужно для API, но не для iframe)
   - X-Frame-Options - отключили ✓ (это было нужно)

### Причина (НАСТОЯЩАЯ):

**Helmet устанавливает по умолчанию:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Эти заголовки **блокируют загрузку страницы в iframe других доменов**, даже если `frame-ancestors` настроен правильно!

### Решение (ПРАВИЛЬНОЕ):

**Файл: `server/app.ts`** - отключить Cross-Origin политики в Helmet:

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // ... все директивы CSP
        frameAncestors: [
          "'self'",
          "https://*.yandex.ru",
          "https://*.yandex.com",
          // ... остальные домены
        ],
      },
    },
    xFrameOptions: false,
    crossOriginOpenerPolicy: false,  // ← КРИТИЧЕСКИ ВАЖНО!
    crossOriginResourcePolicy: false, // ← КРИТИЧЕСКИ ВАЖНО!
    crossOriginEmbedderPolicy: false, // ← КРИТИЧЕСКИ ВАЖНО!
  })
);
```

### Проверка:
```bash
# Заголовков cross-origin-* НЕ должно быть в ответе
curl -I https://securelex.ru/ 2>/dev/null | grep -i "cross-origin"

# Должен вернуть только:
# referrer-policy: strict-origin-when-cross-origin

# НЕ должно быть:
# cross-origin-opener-policy: same-origin
# cross-origin-resource-policy: same-origin
```

### Статус: РЕШЕНО 21.01.2026

---

## МЕТОДОЛОГИЯ ОТЛАДКИ (КАК НАДО БЫЛО ДЕЛАТЬ)

### Принцип 1: Сначала проверить ВСЕ заголовки

При проблемах с iframe/встраиванием ВСЕГДА проверять ВСЕ заголовки:
```bash
curl -I https://сайт.ru/ 2>/dev/null | grep -iE "frame|security|origin|embed"
```

Искать:
- `X-Frame-Options` - должен быть отключен или `ALLOWALL`
- `Content-Security-Policy: frame-ancestors` - должен включать нужные домены
- `Cross-Origin-Opener-Policy` - **НЕ должен быть `same-origin`**
- `Cross-Origin-Resource-Policy` - **НЕ должен быть `same-origin`**
- `Cross-Origin-Embedder-Policy` - **НЕ должен быть `require-corp`**

### Принцип 2: Разделять проблемы

| Проблема | Что проверять |
|----------|---------------|
| Страница не загружается в iframe | Заголовки HTTP (curl -I) |
| API возвращает 500 | Логи сервера (pm2 logs) |
| JavaScript ошибки | Консоль браузера (F12) |
| База данных | Структура таблиц (psql \d) |

### Принцип 3: Начинать с простого

1. **Проверить HTTP статус:** `curl -I https://сайт.ru/`
2. **Проверить заголовки:** искать блокирующие
3. **Проверить логи:** `pm2 logs --lines 50 --err`
4. **Только потом:** смотреть код

### Принцип 4: Один коммит = одно изменение

Не смешивать:
- Исправление CSP
- Исправление базы данных
- Исправление API

Каждое изменение = отдельный коммит = отдельная проверка.

### Принцип 5: Проверять на продакшене СРАЗУ

После КАЖДОГО изменения:
```bash
# 1. Деплой
git pull origin main && npm run build && pm2 restart securelex

# 2. Проверка заголовков
curl -I https://securelex.ru/ | grep -i "cross-origin"

# 3. Проверка API
curl https://securelex.ru/api/endpoint

# 4. Проверка функционала
# Открыть Яндекс.Метрику и попробовать
```

---

## Список ошибок 20-21 января 2026

| # | Ошибка | Причина | Решение | Время |
|---|--------|---------|---------|-------|
| 1 | API /api/conversion/goals 500 | Колонки отсутствуют в БД | ALTER TABLE ADD COLUMN | 4 часа |
| 2 | Яндекс.Метрика "Ошибка загрузки" | Cross-Origin заголовки Helmet | crossOriginOpenerPolicy: false | 2 дня |
| 3 | Analytics timeline error | GROUP BY без site_visits.started_at | Требует исправления SQL | - |
| 4 | Manager stats error | Cannot read 'role' of undefined | Проверка user перед доступом | - |
| 5 | GigaChat certificate error | Неправильный путь к сертификату | Исправить путь к .pem | - |
| 6 | Login 500 Internal Server Error | Поля passwordResetAttempts в схеме но не в БД | Удалить поля из схемы, использовать in-memory rate limiter | 29.01.2026 |

---

## Проблема 7: Login возвращает 500 Internal Server Error (29.01.2026)

### Симптомы
- При входе в систему ошибка "Internal server error"
- На сервере в pm2 logs ошибка PostgreSQL

### Причина
В shared/schema.ts были добавлены поля `passwordResetAttempts` и `passwordResetLastAttempt`, но на сервере эти колонки НЕ существуют в таблице users.

Drizzle ORM при SELECT включает все колонки из схемы. Если колонка отсутствует в БД - возникает ошибка.

### НЕПРАВИЛЬНОЕ решение (НЕ ДЕЛАТЬ!)
```bash
# Это НЕ работает на сервере из-за Peer authentication
psql "$DATABASE_URL" -c "ALTER TABLE..."

# И это НЕ работает
psql -U securelex -d securelex -c "ALTER TABLE..."
# Ошибка: Peer authentication failed
```

### ПРАВИЛЬНОЕ решение
1. **Удалить поля из shared/schema.ts** - не добавлять поля которых нет в БД
2. **Использовать in-memory rate limiter** - server/utils/rate-limiter.ts уже содержит checkPasswordResetRateLimit()
3. **Код routes.ts заменить** на использование in-memory версии

### Исправленный код
**shared/schema.ts** - убрать:
```typescript
// УДАЛИТЬ эти строки:
passwordResetAttempts: integer("password_reset_attempts").default(0),
passwordResetLastAttempt: timestamp("password_reset_last_attempt"),
```

**server/routes.ts** - заменить rate limiting на:
```typescript
const rateCheck = checkPasswordResetRateLimit(email, PASSWORD_RESET_MAX_ATTEMPTS, PASSWORD_RESET_WINDOW_MS);
if (!rateCheck.allowed) {
  return res.status(429).json({ error: "Слишком много запросов" });
}
```

### Правило на будущее
**НИКОГДА** не добавлять поля в схему Drizzle если они не существуют в БД на сервере!
Сначала проверить структуру БД, потом добавлять в схему.

---

## Чеклист для будущих проблем с iframe/встраиванием

- [ ] Проверить `X-Frame-Options` (должен отсутствовать или ALLOWALL)
- [ ] Проверить `frame-ancestors` в CSP (включить нужные домены + wildcards)
- [ ] Проверить `Cross-Origin-Opener-Policy` (должен отсутствовать)
- [ ] Проверить `Cross-Origin-Resource-Policy` (должен отсутствовать)  
- [ ] Проверить `Cross-Origin-Embedder-Policy` (должен отсутствовать)
- [ ] Проверить что изменения задеплоены (git log на сервере)
- [ ] Проверить что pm2 перезапущен
- [ ] Очистить кеш браузера

---

## Команды для быстрой диагностики

```bash
# Все заголовки безопасности
curl -I https://securelex.ru/ 2>/dev/null | grep -iE "security|frame|origin|embed|policy"

# Логи ошибок pm2
pm2 logs securelex --lines 50 --err

# Структура таблицы
psql "postgresql://securelex:SecureLex2024@localhost:5432/securelex" -c "\d conversion_goals"

# Проверка API
curl -v https://securelex.ru/api/conversion/goals 2>&1 | tail -20

# Версия кода на сервере
cd /var/www/securelex.ru && git log --oneline -1
```

---

## Проблема 7: Email не приходят на iCloud (29 января 2026)

### Симптомы
- Письма приходят на Gmail, Яндекс, Mail.ru
- Письма НЕ приходят на iCloud.com
- Раньше приходили

### Диагностика на сервере

```bash
# Проверить SPF
dig +short TXT securelex.ru | grep spf

# Проверить DKIM (селектор dkim, не default!)
dig +short TXT dkim._domainkey.securelex.ru

# Проверить DMARC
dig +short TXT _dmarc.securelex.ru
```

### Результаты диагностики
- **SPF** ✅ OK: `v=spf1 ip4:31.31.197.58 a mx include:_spf.hosting.reg.ru ~all`
- **DKIM** ✅ OK: селектор `dkim._domainkey.securelex.ru` настроен в REG.RU
- **DMARC** ❌ БЫЛО: `p=none` — iCloud игнорирует такие письма!

### Причина
DMARC с `p=none` означает "политика не применяется". iCloud строго требует `p=quarantine` или `p=reject`.

### Решение

**1. Изменить DMARC в DNS панели REG.RU:**
```
_dmarc.securelex.ru TXT:
v=DMARC1; p=quarantine; aspf=r; sp=quarantine; rua=mailto:support@securelex.ru; adkim=r; fo=1
```

**2. Добавить email headers в код (server/email.ts):**
```typescript
await transporter.sendMail({
  // ... обычные поля
  messageId: `<${timestamp}.${randomPart}@securelex.ru>`,
  replyTo: settings.replyTo || settings.from,
  headers: {
    'Return-Path': settings.from,
    'X-Mailer': 'SecureLex Mailer',
    'X-Priority': '3',
  },
});
```

### Проверка после исправления
```bash
dig +short TXT _dmarc.securelex.ru
# Должен показать p=quarantine
```

### Статус: ИСПРАВЛЕНО 29.01.2026
- DMARC изменён на p=quarantine (ожидание обновления DNS 30-120 минут)
- Код email headers обновлён

### Контакты REG.RU поддержки
- DKIM селектор для securelex.ru: `dkim` (не `default`)
- SMTP сервер: sm30.hosting.reg.ru:465 (SSL)
