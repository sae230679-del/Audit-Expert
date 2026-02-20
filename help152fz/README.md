# help152fz.ru — Пакет конфигурации

## Содержимое пакета

| Файл | Назначение |
|------|-----------|
| `ecosystem.config.cjs` | PM2 конфигурация для запуска на VPS |
| `nginx-help152fz.conf` | Nginx конфигурация для reverse proxy |
| `.env.template` | Шаблон переменных окружения (заполнить и переименовать в .env) |
| `setup-vps.sh` | Скрипт автоматической настройки VPS |
| `DEPLOY-help152fz.md` | Полная инструкция по деплою |
| `SESSION_CONTEXT-help152fz.md` | Контекст проекта для агента |
| `ADMIN-SETUP-GUIDE.md` | Пошаговое руководство по настройке всех сервисов |

## Быстрый старт

### 1. Распаковать на VPS
```bash
ssh root@77.222.37.120
mkdir -p /var/www/help152fz.ru
cd /var/www/help152fz.ru
# Распаковать архив сюда
```

### 2. Запустить установку
```bash
chmod +x help152fz/setup-vps.sh
bash help152fz/setup-vps.sh
```

### 3. Настроить через админку
Войти как SuperAdmin (sae230679@yandex.ru) и настроить:
- ЮКасса (платежи)
- SMTP (почта)
- OAuth (Яндекс ID, ВК ID)
- Реферальную программу
- DaData (ИНН)

Подробности — в файле `ADMIN-SETUP-GUIDE.md`

---

## Кодовая фраза для агента

**"Настрой help152fz"**

Агент при получении этой фразы должен:
1. Прочитать `help152fz/SESSION_CONTEXT-help152fz.md`
2. Прочитать `help152fz/DEPLOY-help152fz.md`
3. Прочитать `help152fz/ADMIN-SETUP-GUIDE.md`
4. Подключиться к VPS 77.222.37.120
5. Проверить статус и выполнить необходимые настройки

---

## VPS данные

| Параметр | Значение |
|----------|----------|
| IP | 77.222.37.120 |
| SSH | root / SY59VMU9Cx2LSA6% |
| Hestia | https://77.222.37.120:8083 |
| Hestia (admin) | admin / Que8shee2aa1oz |
| Hestia (hestiaadmin) | hestiaadmin / JYR*^LIfxdhbHETEA% |
| Домен | help152fz.ru |
| Порт приложения | 5000 |
| PM2 процесс | help152fz |
| БД | help152fz / Help152fz2024 |
