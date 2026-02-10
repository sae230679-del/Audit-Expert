# Help152FZ — Обзор проекта

## Назначение
Платформа Help152FZ — русскоязычное веб-приложение для проверки сайтов на соответствие российским законам о защите персональных данных (152-ФЗ и 149-ФЗ).

## Основные функции
1. **Экспресс-аудит** — бесплатная быстрая проверка сайта по 9 критериям (~30 секунд)
2. **Платный полный аудит** — глубокий анализ с генерацией PDF-отчёта
3. **Генерация юридических документов** — с использованием AI (GigaChat, Yandex GPT, OpenAI)
4. **Реферальная программа** — бонусы за привлечение пользователей + комиссия с заказов
5. **Личный кабинет** — история заказов, управление сайтами, уведомления, настройки подписок
6. **Админ-панель** — управление заказами, пользователями, пакетами, промокодами, настройками
7. **AI-консультант** — публичный чат-бот для консультаций по ФЗ-152
8. **Справочник (Guide)** — база знаний по ФЗ-152 с разделами и статьями
9. **Система тикетов** — поддержка пользователей
10. **Мониторинг сайтов** — подписки на периодические проверки (в разработке)

## Технологический стек

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM с PostgreSQL
- **Auth**: JWT (jsonwebtoken), bcrypt для хеширования паролей
- **Платежи**: YooKassa (@a2seven/yoo-checkout)
- **Email**: Nodemailer (SMTP, настраиваемый из админ-панели)
- **Telegram**: Telegram Bot API для уведомлений
- **PDF**: Генерация PDF-отчётов (pdf-service.ts, pdf-generator.ts)
- **AI**: GigaChat (Сбер), Yandex GPT, OpenAI (с возможностью прокси)

### Frontend
- **Framework**: React 18 + TypeScript
- **Bundler**: Vite
- **Routing**: wouter
- **State/Data**: TanStack React Query v5
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Icons**: lucide-react
- **Forms**: react-hook-form + zod resolver

### Database
- **PostgreSQL** (Neon-backed через Replit)
- **ORM**: Drizzle ORM с drizzle-zod для валидации

## Структура проекта

### Серверные файлы (`server/`)
| Файл | Назначение | Строк |
|------|-----------|-------|
| `routes.ts` | Все API-маршруты (REST) | ~3562 |
| `storage.ts` | Интерфейс хранилища (IStorage) + реализация | ~953 |
| `audit-engine.ts` | Алгоритм экспресс-проверки сайтов | ~2607 |
| `compliance-checker.ts` | Проверка соответствия ФЗ-152 | ~608 |
| `compliance-engine-v2.ts` | Улучшенный движок проверки | - |
| `email-service.ts` | SMTP email-сервис (nodemailer) | ~588 |
| `notification-service.ts` | Диспетчер уведомлений (email + Telegram + in-app) | ~429 |
| `telegram-notifications.ts` | Telegram Bot уведомления | - |
| `yookassa.ts` | Интеграция с YooKassa (платежи) | ~209 |
| `gigachat.ts` | Интеграция с GigaChat (Сбер AI) | - |
| `ai-consultation-service.ts` | AI-консультант для публичного чата | - |
| `pdf-service.ts` | Генерация PDF-отчётов | - |
| `pdf-generator.ts` | Альтернативный генератор PDF | - |
| `admin-init.ts` | Инициализация суперадмина | - |
| `site-type-detector.ts` | Определение типа сайта | - |
| `enhanced-detection.ts` | Расширенное обнаружение элементов | - |
| `hosting-checker.ts` | Проверка хостинга сайта | - |
| `rkn-parser.ts` | Парсинг данных Роскомнадзора | - |
| `penalties-map.ts` | Карта штрафов за нарушения | - |
| `playwright-fetcher.ts` | Получение HTML через Playwright | - |
| `guide-knowledge-service.ts` | Сервис базы знаний справочника | - |
| `document-routes.ts` | Маршруты документооборота | - |
| `analytics-routes.ts` | Маршруты аналитики | - |

### Фронтенд (`client/src/pages/`)

#### Публичные страницы
| Файл | Назначение |
|------|-----------|
| `home.tsx` | Лендинг / главная страница |
| `auth.tsx` | Авторизация и регистрация |
| `auth-callback.tsx` | Callback для OAuth (VK, Яндекс) |
| `payment.tsx` | Страница оплаты |
| `full-audit.tsx` | Страница полного аудита |
| `cases.tsx` | Кейсы успешных аудитов |
| `referral.tsx` | Реферальная программа |
| `reset-password.tsx` | Восстановление пароля |
| `ai-chat.tsx` | AI-консультант (публичный чат) |
| `guide.tsx` | Справочник ФЗ-152 |
| `tools.tsx` | Инструменты |
| `document.tsx` | Документы |

#### Личный кабинет
| Файл | Назначение |
|------|-----------|
| `cabinet.tsx` | Главная страница кабинета |
| `cabinet/notification-settings.tsx` | Настройки уведомлений |
| `site-detail.tsx` | Детали сайта |

#### Админ-панель (`pages/admin/`)
| Файл | Назначение |
|------|-----------|
| `dashboard.tsx` | Дашборд администратора |
| `manager-dashboard.tsx` | Дашборд менеджера |
| `lawyer-dashboard.tsx` | Дашборд юриста |
| `orders.tsx` | Управление заказами |
| `users.tsx` | Управление пользователями |
| `packages.tsx` | Управление пакетами услуг |
| `messages.tsx` | Сообщения (контактная форма) |
| `settings.tsx` | Настройки сайта |
| `faq.tsx` | FAQ |
| `cases.tsx` | Управление кейсами |
| `promo-codes.tsx` | Промокоды |
| `referral-settings.tsx` | Настройки реферальной программы |
| `referrals.tsx` | Управление рефералами |
| `superadmin-referral-settings.tsx` | Настройки рефералов (суперадмин) |
| `sites.tsx` | Управление сайтами пользователей |
| `tickets.tsx` | Тикеты поддержки |
| `documents.tsx` | Документооборот |
| `payments.tsx` | Платежи |
| `notifications.tsx` | Уведомления |
| `ai-settings.tsx` | Настройки AI-провайдеров |
| `ai-consultant.tsx` | Настройки AI-консультанта |
| `gigachat.tsx` | Настройки GigaChat |
| `analytics.tsx` | Аналитика |
| `analytics-express.tsx` | Аналитика экспресс-аудитов |
| `analytics-users.tsx` | Аналитика пользователей |
| `guide.tsx` | Управление справочником |
| `integrations.tsx` | Интеграции (виджеты, метрика) |

## Модель данных (shared/schema.ts)

### Основные таблицы
| Таблица | Назначение |
|---------|-----------|
| `users` | Пользователи (все роли) |
| `packages` | Пакеты услуг |
| `orders` | Заказы (экспресс и полный аудит) |
| `faqItems` | Вопросы-ответы |
| `siteSettings` | Настройки сайта (единственная запись) |
| `contactMessages` | Сообщения контактной формы |
| `menuItems` | Пункты меню |
| `cases` | Кейсы аудитов |
| `promoCodes` | Промокоды |

### Реферальная система
| Таблица | Назначение |
|---------|-----------|
| `referralSettings` | Настройки: бонус, скидка, комиссия, мин. выплата |
| `referrals` | Связи реферер-реферал |
| `commissions` | История начислений комиссий |
| `payouts` | Запросы на вывод средств |

### Уведомления и подписки
| Таблица | Назначение |
|---------|-----------|
| `notifications` | Внутренние уведомления |
| `userSubscriptions` | Настройки подписок пользователей |
| `passwordResets` | Токены восстановления пароля |

### Мониторинг и аудит
| Таблица | Назначение |
|---------|-----------|
| `userSites` | Сайты пользователей |
| `siteAudits` | Результаты аудитов |
| `auditFindings` | Отдельные нарушения |
| `subscriptionPlans` | Тарифные планы мониторинга |
| `siteSubscriptions` | Подписки на мониторинг |

### Документооборот
| Таблица | Назначение |
|---------|-----------|
| `documents` | Документы для клиентов |
| `documentVersions` | Версии документов |
| `documentReviews` | Ревью документов юристом |

### Тикеты
| Таблица | Назначение |
|---------|-----------|
| `tickets` | Тикеты поддержки |
| `ticketMessages` | Сообщения в тикетах |

### Справочник
| Таблица | Назначение |
|---------|-----------|
| `guideSections` | Разделы справочника |
| `guideTopics` | Темы внутри разделов |
| `guideArticles` | Статьи справочника |

## Роли и доступ (RBAC)
| Роль | Доступ |
|------|--------|
| `user` | Личный кабинет, заказы, рефералы |
| `manager` | Админ-панель: заказы, документы, сообщения |
| `lawyer` | Ревью документов, юридические проверки |
| `admin` | Полный доступ к админ-панели |
| `superadmin` | Настройки системы, управление ролями, реферальные настройки |

## Платежная система
- **YooKassa** — основная платежная система
- **Тестовый режим** — имитация успешной оплаты при `yookassaTestMode = true`
- **Webhook** — обработка событий `payment.succeeded` и `payment.canceled`
- **Реферальная комиссия** — автоматическое начисление при успешной оплате через webhook

## AI-провайдеры
| Провайдер | Назначение |
|-----------|-----------|
| GigaChat (Сбер) | Генерация документов, AI-консультант |
| Yandex GPT | Альтернативный провайдер |
| OpenAI | С поддержкой прокси-сервера |

## Уведомления
1. **Email** — через SMTP (nodemailer), настраивается из админ-панели
2. **Telegram** — через Telegram Bot API
3. **In-App** — внутренние уведомления в личном кабинете
4. **Диспетчер** — notification-service.ts проверяет настройки admin + user subscription

## Ключевые API-маршруты

### Публичные
- `POST /api/quick-check` — экспресс-проверка сайта
- `POST /api/payment/create` — создание платежа
- `POST /api/yookassa/webhook` — webhook YooKassa
- `POST /api/promo-codes/validate` — валидация промокода
- `POST /api/contact` — контактная форма
- `GET /api/packages` — список пакетов
- `GET /api/faq` — FAQ
- `GET /api/cases` — кейсы

### Аутентификация
- `POST /api/auth/register` — регистрация пользователя
- `POST /api/auth/user-login` — вход пользователя
- `POST /api/auth/login` — вход администратора
- `GET /api/auth/me` — текущий профиль
- `GET /api/auth/vk` — OAuth VK
- `GET /api/auth/yandex` — OAuth Яндекс
- `POST /api/auth/forgot-password` — запрос сброса пароля
- `POST /api/auth/reset-password` — сброс пароля

### Личный кабинет (/api/user/*)
- `GET /api/user/orders` — заказы
- `GET /api/user/referrals` — рефералы
- `GET /api/user/commissions` — комиссии
- `GET /api/user/payouts` — выплаты
- `POST /api/user/payouts` — запрос на вывод
- `GET /api/user/notifications` — уведомления
- `GET /api/user/sites` — сайты
- `GET /api/user/subscriptions` — подписки

### Админ-панель (/api/admin/*)
- `GET /api/admin/stats` — статистика
- CRUD для: users, orders, packages, faq, cases, promo-codes, messages, tickets
- `GET/PATCH /api/admin/referral-settings` — настройки реферальной программы
- `GET/PATCH /api/admin/settings` — настройки сайта
- `GET/PATCH /api/admin/payouts` — управление выплатами

## Дата создания документа
Февраль 2026
