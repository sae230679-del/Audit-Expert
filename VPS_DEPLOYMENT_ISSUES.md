# Анализ проблем развёртывания на VPS

## Дата: 02.02.2026
## Сервер: 77.222.37.120 (Ubuntu 24.04)
## Проект: Help152FZ

---

## 1. Статические файлы не загружаются (CSS/JS возвращают 404)

### Симптомы:
- Сайт открывается, но без стилей (белый фон, сырой текст)
- В консоли браузера: `GET /assets/index-BGSruwtH.css 404`
- Файлы физически существуют в `/var/www/help152fz.ru/dist/public/assets/`

### Почему не решилось сразу:
- Старый PHP-конфиг nginx постоянно возвращался при редактировании
- Использовали `nano` для редактирования, но изменения не сохранялись корректно
- Символическая ссылка в sites-enabled указывала на старый файл

### Правильное решение:
```bash
# 1. Полностью удалить старые конфиги
rm /etc/nginx/sites-enabled/help152fz.ru
rm /etc/nginx/sites-available/help152fz.ru

# 2. Создать новый конфиг одной командой (heredoc)
cat > /etc/nginx/sites-available/help152fz.ru << 'NGINX'
server {
    listen 80;
    server_name help152fz.ru www.help152fz.ru;
    root /var/www/help152fz.ru/dist/public;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

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
}

server {
    listen 443 ssl;
    server_name help152fz.ru www.help152fz.ru;
    root /var/www/help152fz.ru/dist/public;

    ssl_certificate /etc/letsencrypt/live/help152fz.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/help152fz.ru/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

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
}
NGINX

# 3. Активировать и перезагрузить
ln -sf /etc/nginx/sites-available/help152fz.ru /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Как решить быстро в будущем:
1. Всегда проверять `cat /etc/nginx/sites-enabled/help152fz.ru` после редактирования
2. Использовать `rm` + `cat >` вместо `nano` для гарантированной перезаписи
3. Проверять права: `chmod -R 755 /var/www/help152fz.ru/dist/public`

---

## 2. Ошибка 403 "Доступ только для супер-администратора"

### Симптомы:
- Суперадмин не может сохранить настройки
- В консоли: `PUT /api/admin/settings 403`
- В базе данных роль = `superadmin` (правильно)

### Почему не решилось сразу:
- Проблема не в базе данных, а в JWT токене
- Токен был создан ДО назначения роли superadmin
- Роль читается из токена, а не из базы при каждом запросе

### Правильное решение:
```
Просто перелогиниться (выйти и войти заново)
```

### Как решить быстро в будущем:
1. При изменении роли пользователя - всегда просить перелогиниться
2. Проверить роль в токене: декодировать JWT на jwt.io
3. Проверить роль в базе: 
```bash
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz -c "SELECT email, role FROM users WHERE email = 'email@example.com';"
```

---

## 3. Favicon не обновляется

### Симптомы:
- Новый favicon загружен в репозиторий
- На сайте показывается старый favicon (оранжевый логотип)
- `git pull` не работает из-за конфликтов

### Почему не решилось сразу:
- На VPS были локальные изменения (package-lock.json, ecosystem.config.cjs)
- Git отказывался делать pull из-за конфликтов
- Браузер агрессивно кэширует favicon

### Правильное решение:
```bash
# 1. Сбросить локальные изменения
cd /var/www/help152fz.ru
git stash
rm ecosystem.config.cjs  # если есть конфликт

# 2. Обновить репозиторий
git pull origin main

# 3. Пересобрать
npm run build
pm2 restart help152fz

# 4. Или напрямую загрузить файл
curl -o /var/www/help152fz.ru/dist/public/favicon.png "URL_ФАЙЛА"
```

### Обход кэша браузера:
В `client/index.html` добавить версию:
```html
<link rel="icon" href="/favicon.png?v=2" />
```

### Как решить быстро в будущем:
1. Перед `git pull` всегда делать `git stash` или `git reset --hard`
2. Добавлять `?v=X` к favicon при каждом обновлении
3. Напрямую загружать файл через `curl` если git не работает

---

## 4. Git конфликты на VPS

### Симптомы:
- `git pull` выдаёт "Your local changes would be overwritten"
- Упоминаются файлы: package-lock.json, ecosystem.config.cjs

### Правильное решение:
```bash
cd /var/www/help152fz.ru

# Вариант 1: Сохранить локальные изменения
git stash
git pull origin main
git stash pop  # если нужно вернуть

# Вариант 2: Отбросить локальные изменения
git reset --hard
git pull origin main

# Вариант 3: Удалить проблемные файлы
rm package-lock.json ecosystem.config.cjs
git pull origin main
```

### Как решить быстро в будущем:
1. Не редактировать файлы на VPS напрямую
2. Все изменения делать в Replit → GitHub → VPS
3. Добавить в `.gitignore`:
```
ecosystem.config.cjs
.env
```

---

## 5. PM2 не перезапускается / порт занят

### Симптомы:
- `Error: listen EADDRINUSE: address already in use :::18042`
- PM2 показывает статус "online" но приложение не работает

### Правильное решение:
```bash
# Убить все процессы на порту
pm2 delete all
fuser -k 3001/tcp
fuser -k 18042/tcp

# Запустить заново
cd /var/www/help152fz.ru
pm2 start npm --name "help152fz" -- start
pm2 save
```

### Как решить быстро в будущем:
1. Использовать `pm2 restart help152fz` вместо `pm2 start`
2. Проверять логи: `pm2 logs help152fz --lines 50`
3. Проверять какие процессы на порту: `lsof -i :3001`

---

## Быстрый чеклист развёртывания

```bash
# 1. Подключиться к VPS
ssh root@77.222.37.120

# 2. Обновить код
cd /var/www/help152fz.ru
git stash
git pull origin main

# 3. Установить зависимости и собрать
npm install
npm run build

# 4. Перезапустить приложение
pm2 restart help152fz

# 5. Проверить статус
pm2 status
curl -I http://localhost:3001

# 6. Проверить nginx (если были изменения конфига)
nginx -t && systemctl reload nginx
```

---

## Полезные команды для диагностики

```bash
# Логи PM2
pm2 logs help152fz --lines 100

# Логи Nginx
tail -50 /var/log/nginx/error.log
tail -50 /var/log/nginx/access.log

# Проверить процессы на порту
lsof -i :3001
lsof -i :5432

# Проверить статус сервисов
systemctl status nginx
systemctl status postgresql

# Проверить файлы
ls -la /var/www/help152fz.ru/dist/public/
ls -la /var/www/help152fz.ru/dist/public/assets/

# Проверить конфиг nginx
cat /etc/nginx/sites-enabled/help152fz.ru

# Тест подключения к БД
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz -c "SELECT 1;"
```

---

## 6. Foreign Key Constraint при удалении пользователей (КРИТИЧЕСКАЯ)

### Симптомы:
- Ошибка: `Key (user_id)=(5) is not present in table "users"`
- Появляется ПОСЛЕ успешного удаления пользователя
- Может появиться через минуты/часы после удаления
- Затрагивает таблицы: site_visits, page_views, express_checks, admin_section_views

### Почему не решилось сразу:
- Пользователь удалён, но **сессия осталась в таблице session**
- Браузер продолжает делать запросы со старой cookie
- Сервер берёт userId из сессии и пытается записать в БД
- FK constraint отклоняет запись - пользователя уже нет

### Неправильные подходы (НЕ помогут):
- ❌ Очистка логов pm2
- ❌ Перезапуск pm2 без пересборки
- ❌ Только очистка сессий без обновления кода
- ❌ Поиск userId в других таблицах

### Правильное решение:

1. **Создать helper функцию `getValidUserId`:**
```typescript
async function getValidUserId(sessionUserId: number | undefined): Promise<number | null> {
  if (!sessionUserId) return null;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, sessionUserId)).limit(1);
  return user ? user.id : null;
}
```

2. **Использовать перед INSERT с userId:**
```typescript
const validUserId = await getValidUserId(req.session.userId);
await db.insert(siteVisits).values({ userId: validUserId, ... });
```

3. **Файлы где нужно применить:**
   - server/analytics-routes.ts
   - server/routes.ts
   - server/tools-routes.ts

4. **При удалении пользователя удалять сессии:**
```sql
DELETE FROM session WHERE sess->>'userId' = '5';
```

5. **Деплой на VPS:**
```bash
cd /var/www/help152fz.ru && git pull && npm run build && psql "postgresql://..." -c "TRUNCATE session;" && pm2 restart help152fz
```

### Как решить быстро в будущем:
1. Всегда проверять существование пользователя перед INSERT
2. При удалении пользователя очищать его сессии
3. Проверять timestamp билда: `ls -la dist/index.cjs`
4. Проверять сессии: `psql -c "SELECT * FROM session WHERE sess->>'userId' = '5';"`

---

## 7. GigaChat SSL сертификат "bad end line"

### Симптомы:
- `error:0480006C:PEM routines::no start line`
- GigaChat API не работает

### Причина:
В файле `certs/gigachat_chain.pem` сертификаты склеены без переноса строки:
```
-----END CERTIFICATE----------BEGIN CERTIFICATE-----
```

### Правильное решение:
```bash
# Добавить перенос строки между сертификатами
echo "" >> certs/gigachat_chain.pem

# Или пересоздать файл правильно:
cat > certs/gigachat_chain.pem << 'EOF'
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----

-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
EOF
```

### Проверка:
```bash
cat -A certs/gigachat_chain.pem | grep "END CERT"
# Должны быть на разных строках
```

---

## 8. Не удаляется пользователь - Foreign Key на admin_section_views

### Симптомы:
- Ошибка: `Key (id)=(5) is still referenced from table "admin_section_views"`
- "Failed to delete user"

### Причина:
Функция deleteUser в storage.ts не удаляла записи из adminSectionViews

### Правильное решение:
```typescript
// storage.ts - добавить перед удалением пользователя
await db.delete(schema.adminSectionViews).where(eq(schema.adminSectionViews.adminId, id));
await db.delete(schema.documents).where(eq(schema.documents.managerId, id));
await db.delete(schema.documentVersions).where(eq(schema.documentVersions.createdBy, id));
await db.delete(schema.documentReviews).where(eq(schema.documentReviews.reviewerId, id));
await db.delete(schema.users).where(eq(schema.users.id, id));
```

### Как решить быстро в будущем:
1. При ошибке FK constraint смотреть имя constraint - он указывает на таблицу
2. Добавлять удаление из всех связанных таблиц ПЕРЕД удалением пользователя

---

## 9. DaData API не работает - CORS

### Симптомы:
- Фронтенд не может вызвать DaData API напрямую
- CORS errors в консоли браузера

### Причина:
DaData API не поддерживает CORS для браузерных запросов

### Правильное решение:
Создать прокси через бэкенд:
```typescript
// server/routes.ts
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

### Как решить быстро в будущем:
Внешние API без CORS → ВСЕГДА прокси через бэкенд

---

## 10. Playwright браузеры не установлены

### Симптомы:
- `Failed to launch browser: Executable doesn't exist`

### Правильное решение:
```bash
npx playwright install chromium
```

### Как решить быстро в будущем:
Playwright требует отдельной установки браузеров после npm install

---

## 11. Изменения не попали на GitHub

### Симптомы:
- После git pull на сервере - старый код
- Commit есть локально, но не на GitHub

### Правильное решение:
```bash
# В Replit Shell:
git add -A && git commit -m "message" && git push origin main

# На сервере:
git fetch origin && git reset --hard origin/main
```

### Проверка:
```bash
# Локальный commit
git log --oneline -1

# Commit на GitHub
git log --oneline origin/main -1

# Хэши должны совпадать!
```

---

## 12. PM2 не перезапускается / Старый код работает

### Симптомы:
- Код обновлён, но сайт показывает старую версию
- pm2 status показывает "online"

### Правильное решение:
```bash
cd /var/www/help152fz.ru
npm run build
pm2 restart help152fz

# Или полная команда:
git pull && npm run build && pm2 restart help152fz
```

### Проверка:
```bash
# Проверить timestamp билда
ls -la /var/www/help152fz.ru/dist/index.cjs
# Должен быть свежий
```

---

## 13. Enum миграция не применена

### Симптомы:
- При добавлении нового значения в enum - 500 ошибка
- "invalid input value for enum ai_provider"

### Причина:
Drizzle схема ≠ БД схема. Enum в PostgreSQL нужно менять вручную

### Правильное решение:
```sql
ALTER TYPE ai_provider ADD VALUE 'yandexgpt';

# Или через psql:
psql "postgresql://..." -c "ALTER TYPE ai_provider ADD VALUE 'yandexgpt';"
```

### Как решить быстро в будущем:
1. При добавлении значения в enum - обновить БД вручную
2. Проверять enum: `psql -c "SELECT enum_range(NULL::ai_provider);"`

---

## 14. Антифрод API возвращает 500

### Симптомы:
- `/api/antifraud/track` возвращает `{"error":"Tracking error"}`
- В логах: `null value in column "session_id" violates not-null constraint`

### Причина 1: sendBeacon отправляет неправильный Content-Type
`navigator.sendBeacon()` с `JSON.stringify()` отправляет как `text/plain`

### Причина 2: Сервер не генерирует session_id

### Правильное решение:

**Клиент (antifraud-shield.ts):**
```typescript
if (navigator.sendBeacon) {
  const blob = new Blob([jsonBody], { type: 'application/json' });
  navigator.sendBeacon('/api/antifraud/track', blob);
}
```

**Сервер (antifraud-service.ts):**
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

---

## 15. Модальное окно закрывается само

### Симптомы:
- При клике внутри модалки она закрывается

### Причина:
Event bubbling - клик по контенту доходит до overlay

### Правильное решение:
```tsx
<div className="overlay" onClick={onClose}>
  <div className="content" onClick={(e) => e.stopPropagation()}>
    {children}
  </div>
</div>
```

---

## 16. Toast не показывался

### Симптомы:
- После мутации toast не появляется

### Причина:
Toaster компонент не добавлен в App.tsx

### Правильное решение:
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

---

## 17. Уведомления не сбрасывались после просмотра

### Симптомы:
- Счётчики `newReferrals` и `pendingPayouts` считались глобально
- Игнорировали `lastViewedAt` админа

### Причина:
Дубликаты в таблице `admin_section_views`

### Правильное решение:

1. **Очистить дубликаты:**
```sql
DELETE FROM admin_section_views 
WHERE id NOT IN (
  SELECT MAX(id) 
  FROM admin_section_views 
  GROUP BY admin_id, section_name
);
```

2. **Обновить логику подсчёта в storage.ts**

---

## 18. TypeScript ошибки типизации

### Симптомы:
- `user.id.slice is not a function`
- `req.params.id` type error

### Причина:
- `users.id` = integer, не string
- `req.params` = `string | string[]`

### Правильное решение:
```typescript
// Всегда использовать String()
String(user.id).slice(0, 8)
String(req.params.id)

// Расширение типов Express
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
```

---

## 19. Ошибки геокодирования

### Симптомы:
- Платный API вызывается при выключенном источнике
- Координаты не найдены

### Правильное решение:
1. Проверять `yandexApiEnabled` перед вызовом geocodeLocation()
2. Добавить город в fallback-словарь `getDefaultCoordinates()`

---

## Расширенные команды диагностики

```bash
# Логи PM2
pm2 logs help152fz --lines 100
pm2 logs help152fz --err

# Логи Nginx
tail -50 /var/log/nginx/error.log
grep "help152fz.ru" /var/log/nginx/access.log | tail -20

# Процессы на портах
lsof -i :3001
lsof -i :5432
fuser -k 3001/tcp

# Файлы и права
ls -la /var/www/help152fz.ru/dist/public/assets/
chmod -R 755 /var/www/help152fz.ru/dist/public/

# База данных
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz -c "SELECT email, role FROM users;"
PGPASSWORD=Help152FZ2025 psql -h localhost -U help152fz -d help152fz -c "SELECT * FROM session;"

# Git проверка
git log --oneline -5
git log --oneline origin/main -5
git diff origin/main

# Timestamp билда
ls -la /var/www/help152fz.ru/dist/index.cjs
```

---

## ЗОЛОТЫЕ ПРАВИЛА

### Правило 1: НИКОГДА не менять ecosystem.config.cjs на VPS
Всегда через git: Replit → GitHub → VPS

### Правило 2: ВСЕГДА проверять что коммит запушен
```bash
git log --oneline -1              # Локальный
git log --oneline origin/main -1  # GitHub
# Хэши должны совпадать!
```

### Правило 3: Build → Restart
После ЛЮБОГО изменения кода:
```bash
npm run build && pm2 restart help152fz
```

### Правило 4: При FK ошибках смотреть constraint name
Он указывает на проблемную таблицу!

### Правило 5: Session cleanup
При удалении пользователя ВСЕГДА:
```sql
DELETE FROM session WHERE sess->>'userId' = 'USER_ID';
```

### Правило 6: Favicon кэш
Добавлять версию: `<link rel="icon" href="/favicon.png?v=2" />`

---

## Контакты и ресурсы

- **Проект**: Help152FZ
- **VPS**: 77.222.37.120 (Ubuntu 24.04)
- **GitHub**: https://github.com/sae230679-del/Audit-Expert
- **Домен**: help152fz.ru
- **База данных**: postgresql://help152fz:Help152FZ2025@localhost:5432/help152fz
- **Порт приложения**: 3001
