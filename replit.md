# Help152FZ.ru - Legal Compliance Audit Platform

## Overview
Help152FZ is a Russian-language web application designed to assist website owners in ensuring their sites comply with Russian data protection laws (152-FZ and 149-FZ). The platform provides free express audits across 9 compliance criteria and offers detailed reports and professional audit packages for purchase. The project aims to simplify legal compliance for website owners, offering a comprehensive and accessible tool with an integrated AI consultant, a referral program, and robust administrative capabilities.

## User Preferences
Preferred communication style: Simple, everyday language.
Preferred language: Russian (все общение на русском языке).

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful JSON API
- **Authentication**: JWT-based admin authentication
- **Security**: Helmet middleware, rate limiting, brute-force protection, PII masking, SSRF protection, password policy, security agent for compliance checks.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: Shared schema (`shared/schema.ts`)
- **Migrations**: Drizzle Kit

### Core Features and Design
- **Compliance Audit Engine**: Analyzes websites against 9 criteria (HTTPS/SSL, privacy policy, cookie consent, foreign resources, etc.).
- **Admin Panel**: Extensive management features for packages, FAQ, orders, site settings (31 pages), users, tickets, AI settings, promo codes, referrals, payments.
- **User Cabinet**: Personalized dashboard for sites, reports, subscriptions, referrals, payouts, and notification settings.
- **AI Consultant**: Integrates Russian and international LLMs (GigaChat, Yandex GPT, OpenAI) with configurable prompts for legal document generation and support.
- **Knowledge Base**: Hierarchical structure for sections, topics, and articles.
- **RBAC**: 5 roles (user, manager, lawyer, admin, superadmin) with granular permissions.
- **Theming**: Dark theme by default with a light theme toggle.
- **Notifications**: Email (SMTP) and Telegram notifications with customizable templates.
- **Payment Gateway**: YooKassa integration with promo codes and SBP support.
- **Security Hardening**: Includes structured logging (Winston), PII masking, comprehensive security headers, brute-force protection, SSRF protection, and a robust password policy.

## External Dependencies

### Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`

### Third-Party Services
- **PostgreSQL Database**
- **Google Fonts** (Inter, DM Sans, Geist Mono)
- **GigaChat** (Sber) - Russian LLM
- **Yandex GPT** - Russian LLM
- **OpenAI** - GPT models
- **Yandex Speller** - Spell-checking API
- **YooKassa** - Payment gateway
- **Yandex Metrika** - Web analytics
- **Yandex Webmaster** - SEO tools
- **Telegram Bot API** - Notifications
- **Marquiz** - Online quizzes/forms
- **Kaspersky KATA, PT MaxPatrol, Solar appScreener, UserGate WAF** - Integrated IB security solutions.

### Key NPM Packages
- `drizzle-orm`, `drizzle-kit`
- `@tanstack/react-query`
- `react-hook-form`, `@hookform/resolvers`
- `zod`, `drizzle-zod`
- `bcryptjs`, `jsonwebtoken`
- `express`, `express-session`
- `cheerio`
- `helmet`
- `winston`, `winston-daily-rotate-file`
- Radix UI primitives