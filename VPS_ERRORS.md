# Известные ошибки VPS деплоя и их решения

> Этот файл содержит все ошибки, которые возникали при деплое на VPS Hestia.
> **ЧИТАТЬ ПЕРЕД ДЕПЛОЕМ!**

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

## Проверка работоспособности

```bash
# Приложение отвечает
curl -I http://127.0.0.1:3001

# PM2 статус
pm2 status

# Логи
pm2 logs help152fz --lines 50
```
