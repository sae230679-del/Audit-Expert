# Help152FZ.ru - Legal Compliance Audit Platform

## Overview

Help152FZ is a Russian-language web application that helps website owners check their sites for compliance with Russian data protection laws (152-FZ and 149-FZ). The platform offers free express audits that analyze websites across 9 compliance criteria, with options to purchase detailed reports or professional audit packages.

Key features:
- Free 30-second website compliance audit
- 9 criteria checks (HTTPS/SSL, privacy policy, cookie consent, foreign resources, etc.)
- Service packages for different website types (landing pages, e-commerce, medical sites)
- Admin panel for managing packages, FAQ, orders, and site settings (31 admin pages)
- Contact form with rate limiting and spam protection
- Dark theme by default (with light theme toggle)
- Maintenance mode for temporary site unavailability (admin setting)
- AI Consultant (GigaChat/Yandex GPT/OpenAI) with admin-configurable system prompt
- Knowledge base (справочник) with hierarchical structure (sections → topics → articles)
- Referral program with custom links, commissions, payouts
- YooKassa payment integration with promo codes and SBP support
- Email notifications (SMTP with templates for all events)
- Telegram notifications (bot API integration)
- User cabinet with sites, reports, subscriptions, referrals, payouts, notification settings
- External integrations: Yandex Metrika, Webmaster, online consultants, Marquiz
- Contextual hints in audit form fields
- RBAC with 5 roles (user, manager, lawyer, admin, superadmin)
- Analytics dashboard (overview, users, express checks)

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred language: Russian (все общение на русском языке).

### Package Templates
- 9 шаблонов пакетов с предзаполненными данными хранятся в `client/src/lib/package-templates.ts`
- Каждый шаблон содержит: 9 критериев проверки, 15-21 документов, описание, рекомендуемую цену и сроки
- Типы пакетов: Лендинг, Сайт-визитка, Корпоративный сайт, Интернет-магазин, Медицинский сайт, Детские услуги, Форум/соц.сеть, Корпоративный портал, Другой формат
- В админке есть кнопка «Заполнить шаблонами» для массового создания всех пакетов
- При создании нового пакета доступен выбор шаблона из выпадающего списка
- API для массового создания: POST /api/admin/packages/seed

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with HMR support

The frontend follows a component-based architecture with:
- Page components in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/`
- Feature components in `client/src/components/`
- Custom hooks in `client/src/hooks/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API under `/api/` prefix
- **Authentication**: JWT-based admin authentication
- **Rate Limiting**: Custom in-memory rate limiting for contact forms
- **Build**: esbuild for production bundling

The server uses a clean separation:
- `server/routes.ts` - API endpoint definitions
- `server/storage.ts` - Data access layer interface
- `server/db.ts` - Database connection setup

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command

Database tables include:
- `users` - User and admin accounts with roles (user, manager, lawyer, admin, superadmin)
- `packages` - Service packages with pricing
- `faqItems` - FAQ content
- `siteSettings` - Site-wide configuration
- `contactMessages` - Contact form submissions
- `orders` - Purchase orders
- `menuItems` - Navigation configuration
- `userSites` - User's registered websites for monitoring
- `siteAudits` - Audit results with 149-FZ and 152-FZ compliance scores
- `auditFindings` - Detailed findings per audit
- `subscriptionPlans` - Subscription tiers (Basic, Standard, Premium)
- `siteSubscriptions` - User site subscriptions
- `tickets` - Support tickets
- `ticketMessages` - Ticket conversation history
- `referrals` - Referral program tracking
- `payouts` - User payout requests
- `adminLogs` - Admin action audit trail
- `documents` - Document management with workflow statuses
- `documentVersions` - Version history for documents
- `documentReviews` - Lawyer review comments
- `aiPrompts` - Library of AI prompts for document generation
- `documentPackages` - Client document packages with delivery tracking

### AI Services (server/ai-services/)
- **GigaChat** (Сбер) - Russian LLM with MinTsifra certificate, OAuth on port 9443
- **Yandex GPT** - Russian LLM requiring API Key + Folder ID
- **OpenAI** - GPT models with optional proxy support for blocked regions
- **Yandex Speller** - Free spell-checking API for Russian text

### Admin Panel Features (RBAC) - Color-coded by role
- **Panel управления** (blue, all roles): Dashboard overview
- **Manager section** (green): Messages, orders, document generation with AI
- **Lawyer section** (purple): Document review and approval
- **Admin section** (orange): Users, sites, tickets, packages, cases, FAQ
- **Superadmin section** (red): Analytics, AI settings, promo codes, referrals, payments, site settings

Role hierarchy:
1. **user** - Basic client access
2. **manager** - Document generation and client communication
3. **lawyer** - Document review and legal approval
4. **admin** - Full admin panel access except critical settings
5. **superadmin** - Full system access including AI and payment settings

### Notification Services
- `server/email-service.ts` - SMTP email notifications (welcome, password reset, orders, payments, referrals, payouts)
- `server/telegram-notifications.ts` - Telegram bot API notifications
- `server/notification-service.ts` - Unified notification dispatcher

### User Cabinet Features
- **Sites Dashboard**: Overview of all registered sites with compliance scores
- **Site Detail**: Individual site view with tabs for audits, findings, reports
- **Reports Page**: Filterable audit history table with color-coded status
- **Subscriptions Page**: Tariff plan selection and management
- **Referral Program**: Statistics and referral link generation
- **Payouts**: Request and track payouts from referral earnings
- **Notifications**: View notification history
- **Notification Settings**: Configure email/Telegram preferences per event type

### Security Considerations
- JWT tokens for admin authentication (requires SESSION_SECRET env var)
- Bcrypt password hashing
- Rate limiting on contact form submissions
- Honeypot fields for spam prevention
- HTTPS enforcement checking in audits

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for JWT signing

### Third-Party Services
- **PostgreSQL Database** - Primary data storage (provisioned via Replit)
- **Google Fonts** - Typography (Inter, DM Sans, Geist Mono)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Server state management
- `react-hook-form` / `@hookform/resolvers` - Form handling
- `zod` / `drizzle-zod` - Schema validation
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `express` / `express-session` - Web server
- `cheerio` - HTML parsing for compliance checking
- Radix UI primitives - Accessible UI components

### Integrated Modules (adapted from export archive)
- `server/compliance-checker.ts` - Website compliance checking engine (renamed from audit-engine)
- `server/analytics-routes.ts` - Analytics API routes for admin dashboard
- `server/penalties-map.ts` - Penalty coefficients for compliance violations  
- `shared/criteria-registry.ts` - 9 compliance criteria definitions (Service 1)
- `client/src/pages/admin/analytics.tsx` - Analytics overview page
- `client/src/pages/admin/analytics-users.tsx` - User analytics detail page
- `client/src/pages/admin/analytics-express.tsx` - Express check analytics page

Note: The справочник (guide) is internal-only for AI document analysis and manager assistance, not public-facing.

### Deployment
- **Replit**: Autoscale deployment with `npm run build` → `npm run start`
- **VPS**: Ubuntu 24.04 with Hestia Panel, deploy via GitHub → `git pull` → `npm install` → `npm run build` → `pm2 restart`

### Detailed Documentation
- `PROJECT_OVERVIEW.md` — Полный обзор проекта, структура, API, модель данных
- `ERRORS_AND_CHANGES.md` — Реестр ошибок, план исправлений, история изменений

### Known Critical Bugs (see ERRORS_AND_CHANGES.md)
- BUG-001: Реферальная комиссия не начисляется (getUserByReferralCode вместо getUser)
- BUG-002: Запись referral не создаётся при регистрации
- BUG-006: userId не привязывается к заказам при оплате

### Recent Changes (2026-02-06)
- **GigaChat OAuth**: Исправлен RqUID на UUID4 формат (требование Sber API)
- **GigaChat expires_at**: Исправлена обработка — Сбер возвращает миллисекунды, не секунды
- **GigaChat rejectUnauthorized**: Отключена проверка SSL для сертификатов НУЦ Минцифры (всегда, не только development)
- **GigaChat диагностика**: Добавлена детальная обработка HTTP ошибок (401 сброс токена, логирование)
- **JWT авторизация**: Все 40+ маршрутов переведены на русские сообщения с кодами (TOKEN_EXPIRED/INVALID_TOKEN/NO_TOKEN)
- **JWT срок жизни**: Увеличен до 7 дней для предотвращения частых истечений на VPS
- **verifyUser middleware**: Создан единый middleware для пользовательских маршрутов
- **queryClient**: Глобальная обработка 401 с очисткой сессии и перенаправлением на логин
- Added AI Consultant admin page with provider selection, system prompt, test functionality
- Added Knowledge Base (справочник) admin page with hierarchical management
- Added External Integrations admin page (Yandex Metrika, Webmaster, consultants, Marquiz)
- Added contextual hints (HintTooltip) to audit form fields
- Added ExternalWidgets component for dynamic script/meta injection
- Updated header for dynamic menu items (AI Consultant, Guide)
- Configured production deployment settings

### Development Tools
- Vite with React plugin
- Replit-specific plugins (error overlay, cartographer, dev banner)
- TypeScript with strict mode
- Tailwind CSS with PostCSS