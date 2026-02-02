# Help152FZ.ru - Legal Compliance Audit Platform

## Overview

Help152FZ is a Russian-language web application that helps website owners check their sites for compliance with Russian data protection laws (152-FZ and 149-FZ). The platform offers free express audits that analyze websites across 9 compliance criteria, with options to purchase detailed reports or professional audit packages.

Key features:
- Free 30-second website compliance audit
- 9 criteria checks (HTTPS/SSL, privacy policy, cookie consent, foreign resources, etc.)
- Service packages for different website types (landing pages, e-commerce, medical sites)
- Admin panel for managing packages, FAQ, orders, and site settings
- Contact form with rate limiting and spam protection
- Dark theme by default (with light theme toggle)
- Maintenance mode for temporary site unavailability (admin setting)

## User Preferences

Preferred communication style: Simple, everyday language.

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

### User Cabinet Features
- **Sites Dashboard**: Overview of all registered sites with compliance scores
- **Site Detail**: Individual site view with tabs for audits, findings, reports
- **Reports Page**: Filterable audit history table with color-coded status
- **Subscriptions Page**: Tariff plan selection and management
- **Referral Program**: Statistics and referral link generation

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

### Development Tools
- Vite with React plugin
- Replit-specific plugins (error overlay, cartographer, dev banner)
- TypeScript with strict mode
- Tailwind CSS with PostCSS