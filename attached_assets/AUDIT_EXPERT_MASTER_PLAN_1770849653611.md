# Аудит Эксперт (help152fz.ru) — Мастер-План Реализации

**Дата создания**: 2026-02-11
**Последнее обновление**: 2026-02-11
**Статус**: Планирование (реализация после SecureLex.ru)
**Исходная кодовая база**: export-audit-expert/

---

## ЦЕЛЬ ПРОЕКТА

Перенести все улучшения безопасности и новый функционал из SecureLex.ru в Аудит Эксперт (help152fz.ru), адаптировав под его архитектуру и визуальный стиль (изумрудная тема).

---

## ОТЛИЧИЯ ОТ SECURELEX.RU

| Параметр | SecureLex.ru | Аудит Эксперт |
|----------|-------------|---------------|
| Домен | securelex.ru | help152fz.ru |
| Цветовая схема | Синяя (primary) | Изумрудная (158 64% 35%) |
| Шрифт | По умолчанию | Inter |
| Код | Основной репозиторий | export-audit-expert/ |
| VPS | 77.222.46.145 | Отдельный VPS (настроить) |
| Брендинг | SecureLex | Аудит Эксперт / Help152FZ |

---

## БЛОК А: КРИТИЧЕСКИЕ УЯЗВИМОСТИ (Перенос из SecureLex)

### А.1 — Двухуровневая система паролей

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Что сделано:**
- `shared/password-policy.ts` — скопирован без изменений
- `shared/schema.ts` — добавлено поле `passwordUpgradedAt` в таблицу users

**Что осталось при интеграции в целевой проект:**
- Обновить серверные роуты — все точки валидации паролей
- Создать `password-generator.tsx` с изумрудной темой
- Обновить страницу регистрации
- Добавить карточку "Политика паролей" в SuperAdmin настройки
- Добавить баннер обновления пароля в dashboard

---

### А.2 — Brute-force защита

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11) — настройки через system_settings

**Что осталось при интеграции:**
- Настроить rate limiter: 5 попыток / 15 минут блокировки
- Добавить system_settings для управления через админку

---

### А.3 — CSP ужесточение

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11) — CSRF защита через url.ts

**Что осталось при интеграции:**
- Удалить unsafe-eval из CSP
- Минимизировать unsafe-inline
- Добавить CSRF double-submit cookie
- Проверить что Yandex.Metrika работает с новым CSP

---

### А.4 — SSRF усиление

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Создан файл:** `export-audit-expert/server/utils/url.ts`
- DNS rebinding проверка
- IPv6 loopback блокировка
- Fail-closed обработка
- selfDomains обновлены на help152fz.ru

---

## БЛОК Б: ИНФРАСТРУКТУРА БЕЗОПАСНОСТИ

### Б.1 — Winston логирование

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Созданные файлы:**
- `export-audit-expert/server/utils/logger.ts` — Winston + DailyRotateFile (service: "audit-expert")
- `export-audit-expert/server/utils/pii.ts` — PII маскировка

**Что осталось при интеграции:**
- Установить пакеты: `winston`, `winston-daily-rotate-file`
- Заменить console.log на logger в серверных модулях

---

## БЛОК В: AI SECURITY AGENT И ДОКУМЕНТАЦИЯ

### В.1 — AI Security Agent

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Создан файл:** `export-audit-expert/server/security-agent.ts`
- 18+ проверок безопасности, User-Agent: AuditExpert-SecurityAgent/1.0
- Маппинг OWASP/ФСТЭК/ГОСТ

**Что осталось при интеграции:**
- Создать страницу SuperAdmin с изумрудной темой
- Подключить API роуты

### В.2 — Генератор документации

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Создан файл:** `export-audit-expert/server/doc-generator.ts`
- 6 шаблонов, брендинг "Аудит Эксперт (help152fz.ru)"

**Что осталось при интеграции:**
- Создать страницу SuperAdmin с настройками
- Подключить API роуты

### В.3 — Интеграции ИБ

**Статус**: [x] ПЕРЕНЕСЕНО (2026-02-11)

**Создан файл:** `export-audit-expert/server/integrations-ib.ts`
- Kaspersky KATA, PT MaxPatrol, Solar appScreener, UserGate WAF
- User-Agent: AuditExpert/1.0

**Что осталось при интеграции:**
- Создать страницу SuperAdmin → Интеграции ИБ
- Подключить API роуты

---

## БЛОК Г: ДЕПЛОЙ help152fz.ru

### Г.1 — Подготовка VPS

**Статус**: [ ] Ожидает

**Что сделать:**
1. Настроить DNS для help152fz.ru
2. Создать PostgreSQL базу данных
3. Склонировать код из export-audit-expert/
4. Настроить ecosystem.config.cjs
5. Настроить nginx с TLS 1.3
6. Let's Encrypt через Hestia

### Г.2 — Чеклист деплоя

```
[ ] DNS записи настроены (A → IP сервера)
[ ] PostgreSQL база создана
[ ] git clone + npm install
[ ] ecosystem.config.cjs создан со всеми env переменными
[ ] npm run build — без ошибок
[ ] npm run db:push — схема применена
[ ] cp -r dist/public/* /home/admin/web/help152fz.ru/public_html/
[ ] nginx.ssl.conf настроен (proxy headers, X-Forwarded-Proto!)
[ ] SSL сертификат (Let's Encrypt через Hestia)
[ ] pm2 start ecosystem.config.cjs
[ ] Проверить pm2 logs — нет ошибок
[ ] Создать SuperAdmin пользователя
[ ] Заполнить seed данные (9 критериев, пакеты, инструменты)
[ ] Проверить все страницы в браузере
[ ] Очистить кэш и проверить авторизацию
```

---

## ЖУРНАЛ ИЗМЕНЕНИЙ

> Сюда записываются ВСЕ изменения, ошибки, баги и решения для help152fz.ru

### 2026-02-11

| Время | Действие | Файлы | Ошибки/Решения |
|-------|---------|-------|----------------|
| — | Создан мастер-план | AUDIT_EXPERT_MASTER_PLAN.md | — |
| — | Перенесены блоки А.1-А.4, Б.1, В.1-В.3 | shared/password-policy.ts, server/utils/pii.ts, server/utils/logger.ts, server/utils/url.ts, server/security-agent.ts, server/doc-generator.ts, server/integrations-ib.ts | Все SecureLex→AuditExpert заменены, selfDomains обновлены |
| — | Обновлена schema.ts | shared/schema.ts | Добавлено passwordUpgradedAt |

---

## ОШИБКИ И РЕШЕНИЯ ПРИ ДЕПЛОЕ

> Все ошибки из SecureLex.ru актуальны и для Аудит Эксперта!
> См. SESSION_CONTEXT.md раздел "Известные ошибки и решения"

### Дополнительные особенности help152fz.ru

1. **Цветовая тема** — убедиться что все компоненты используют CSS-переменные, а не хардкод цветов
2. **Шрифт Inter** — добавить в index.html и tailwind.config.ts
3. **Брендинг** — заменить все упоминания SecureLex на "Аудит Эксперт" / "Help152FZ"
4. **Отдельный Telegram бот** — не использовать те же токены что у SecureLex
5. **Отдельные API ключи** — GigaChat, YandexGPT, DaData — свои для каждого проекта

---

## ПОРЯДОК ПЕРЕНОСА ИЗМЕНЕНИЙ

> Важно: переносить изменения ПОСЛЕ того как они протестированы на SecureLex.ru

1. Скопировать shared/password-policy.ts
2. Обновить shared/schema.ts (добавить passwordUpgradedAt)
3. Обновить серверные роуты (register, login, reset-password, admin-reset)
4. Создать клиентские компоненты (password-generator, password-upgrade-banner)
5. Обновить страницы (auth.tsx, reset-password.tsx, superadmin-settings.tsx)
6. Скопировать серверные модули безопасности (brute-force, CSP, SSRF)
7. Скопировать Winston конфигурацию
8. Скопировать AI Security Agent
9. Скопировать генератор документации
10. Скопировать интеграционные модули
11. npm run build && npm run db:push
12. Деплой на VPS

---

## ВИЗУАЛЬНЫЕ АДАПТАЦИИ (из AUDIT_EXPERT_SETUP.md)

### Цвета для компонентов

| Элемент | CSS переменная | Значение |
|---------|---------------|----------|
| Кнопки | --primary | 158 64% 35% |
| Акценты | --accent | 158 50% 45% |
| Фон карточек | --card | 0 0% 100% |
| Фон страницы | --background | 158 10% 98% |
| Бордеры | --border | 158 20% 85% |
| Текст | --foreground | 158 30% 10% |
| Индикатор силы пароля (слабый) | --destructive | 0 84% 60% |
| Индикатор силы пароля (средний) | --warning | 45 93% 47% |
| Индикатор силы пароля (сильный) | --success | 142 76% 36% |
