import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, serial, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// =====================================================
// ENUMS
// =====================================================

export const documentStatusEnum = pgEnum("document_status", [
  "draft", "in_progress", "pending_review", "revision", "approved", "delivered"
]);

export const aiProviderEnum = pgEnum("ai_provider", ["gigachat", "yandex", "openai"]);

export const promptCategoryEnum = pgEnum("prompt_category", [
  "privacy_policy", "consent_form", "cookie_policy", "user_agreement", 
  "terms_of_service", "confidentiality", "audit_analysis", "legal_check", "other"
]);

export const documentTypeEnum = pgEnum("document_type", [
  "privacy_policy", "consent_form", "cookie_policy", "cookie_banner",
  "user_agreement", "offer", "terms_of_service", "confidentiality", "other"
]);

export const guideArticleStatusEnum = pgEnum("guide_article_status", ["draft", "published", "archived"]);

export const referralParticipantTypeEnum = pgEnum("referral_participant_type", [
  "self_employed", "ip", "ooo"
]);

export const referralParticipantStatusEnum = pgEnum("referral_participant_status", [
  "pending", "approved", "rejected"
]);

export const referralPayoutStatusEnum = pgEnum("referral_payout_status", [
  "pending", "processing", "completed", "rejected"
]);

// Users table - admins and regular users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: text("role").default("user"), // 'user', 'manager', 'lawyer', 'admin', 'superadmin'
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  bonusBalance: integer("bonus_balance").default(0),
  // Extended profile fields
  fullName: text("full_name"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  telegramHandle: text("telegram_handle"),
  vkProfile: text("vk_profile"),
  organizationInn: text("organization_inn"),
  siteUrl: text("site_url"),
  // OAuth provider IDs
  vkId: text("vk_id"),
  yandexId: text("yandex_id"),
  avatarUrl: text("avatar_url"),
  passwordUpgradedAt: timestamp("password_upgraded_at"),
  passwordPolicyLevel: text("password_policy_level").default("standard"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service packages - Лендинг, Интернет-магазин, etc.
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  features: text("features").array(),
  criteria: text("criteria").array(),
  deadline: text("deadline"),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// FAQ items
export const faqItems = pgTable("faq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Site settings - single row for all settings
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name"),
  companyType: text("company_type"), // ИП, ООО, Самозанятый
  inn: text("inn"),
  ogrn: text("ogrn"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  privacyEmail: text("privacy_email"),
  telegram: text("telegram"),
  vk: text("vk"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bik: text("bik"),
  correspondentAccount: text("correspondent_account"),
  privacyPolicy: text("privacy_policy"),
  termsOfService: text("terms_of_service"),
  cookiePolicy: text("cookie_policy"),
  consentText: text("consent_text"),
  offerText: text("offer_text"),
  yookassaShopId: text("yookassa_shop_id"),
  yookassaSecretKey: text("yookassa_secret_key"),
  yookassaTestMode: boolean("yookassa_test_mode").default(true),
  expressReportPrice: integer("express_report_price").default(900),
  casesPageEnabled: boolean("cases_page_enabled").default(true),
  monitoringComingSoon: boolean("monitoring_coming_soon").default(true),
  // OAuth settings
  vkAppId: text("vk_app_id"),
  vkAppSecret: text("vk_app_secret"),
  yandexClientId: text("yandex_client_id"),
  yandexClientSecret: text("yandex_client_secret"),
  oauthEnabled: boolean("oauth_enabled").default(false),
  maintenanceMode: boolean("maintenance_mode").default(false),
  maintenanceMessage: text("maintenance_message"),
  gigachatSettings: jsonb("gigachat_settings"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  telegramNotificationsEnabled: boolean("telegram_notifications_enabled").default(false),
  // AI Provider Settings - GigaChat (Sber)
  gigachatEnabled: boolean("gigachat_enabled").default(false),
  gigachatCredentials: text("gigachat_credentials"),
  gigachatScope: text("gigachat_scope").default("GIGACHAT_API_PERS"), // GIGACHAT_API_PERS, GIGACHAT_API_CORP
  gigachatModel: text("gigachat_model").default("GigaChat"),
  // AI Provider Settings - Yandex GPT
  yandexGptEnabled: boolean("yandex_gpt_enabled").default(false),
  yandexGptApiKey: text("yandex_gpt_api_key"),
  yandexGptFolderId: text("yandex_gpt_folder_id"),
  yandexGptModel: text("yandex_gpt_model").default("yandexgpt/latest"),
  // AI Provider Settings - OpenAI (custom server with proxy)
  openaiEnabled: boolean("openai_enabled").default(false),
  openaiApiKey: text("openai_api_key"),
  openaiProxyUrl: text("openai_proxy_url"),
  openaiProxyEnabled: boolean("openai_proxy_enabled").default(false),
  openaiModel: text("openai_model").default("gpt-4"),
  // Default AI provider for document generation
  defaultAiProvider: text("default_ai_provider").default("gigachat"), // gigachat, yandex, openai
  // SMTP Email Settings
  smtpEnabled: boolean("smtp_enabled").default(false),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromName: text("smtp_from_name"),
  smtpFromEmail: text("smtp_from_email"),
  smtpEncryption: text("smtp_encryption").default("tls"), // none, ssl, tls
  // Telegram group description
  telegramGroupDescription: text("telegram_group_description"),
  // Notification toggles (admin-level)
  notifyEmailRegistration: boolean("notify_email_registration").default(true),
  notifyEmailOrder: boolean("notify_email_order").default(true),
  notifyEmailPayment: boolean("notify_email_payment").default(true),
  notifyEmailReferral: boolean("notify_email_referral").default(true),
  notifyEmailExpressReport: boolean("notify_email_express_report").default(true),
  notifyEmailPasswordReset: boolean("notify_email_password_reset").default(true),
  notifyTgRegistration: boolean("notify_tg_registration").default(true),
  notifyTgOrder: boolean("notify_tg_order").default(true),
  notifyTgPayment: boolean("notify_tg_payment").default(true),
  notifyTgReferral: boolean("notify_tg_referral").default(true),
  notifyTgExpressReport: boolean("notify_tg_express_report").default(true),
  // AI Consultant (public chat)
  aiConsultantEnabled: boolean("ai_consultant_enabled").default(false),
  aiConsultantProvider: text("ai_consultant_provider").default("gigachat"),
  aiConsultantSystemPrompt: text("ai_consultant_system_prompt"),
  aiConsultantWelcomeMessage: text("ai_consultant_welcome_message"),
  aiConsultantMaxTokens: integer("ai_consultant_max_tokens").default(1024),
  // Guide / Справочник
  guideEnabled: boolean("guide_enabled").default(false),
  // Yandex Webmaster
  yandexWebmasterEnabled: boolean("yandex_webmaster_enabled").default(false),
  yandexWebmasterCode: text("yandex_webmaster_code"),
  // Yandex Metrika
  yandexMetrikaEnabled: boolean("yandex_metrika_enabled").default(false),
  yandexMetrikaId: text("yandex_metrika_id"),
  // Online consultant widget (Jivo, Tawk, etc.)
  onlineConsultantEnabled: boolean("online_consultant_enabled").default(false),
  onlineConsultantName: text("online_consultant_name"),
  onlineConsultantCode: text("online_consultant_code"),
  // Marquiz widget
  marquizEnabled: boolean("marquiz_enabled").default(false),
  marquizCode: text("marquiz_code"),
  // Hints / tooltips on site
  hintsEnabled: boolean("hints_enabled").default(true),
});

// Contact form messages
export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  isSpam: boolean("is_spam").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  siteUrl: text("site_url").notNull(),
  email: text("email").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerCompany: text("customer_company"),
  customerWhatsapp: text("customer_whatsapp"),
  customerTelegram: text("customer_telegram"),
  customerInn: text("customer_inn"),
  siteType: text("site_type"),
  packageId: varchar("package_id"),
  promoCodeId: varchar("promo_code_id"),
  orderType: text("order_type").notNull(), // 'express' or 'package'
  status: text("status").default("pending"), // pending, paid, completed
  totalScore: integer("total_score"),
  auditResults: jsonb("audit_results"),
  paymentId: text("payment_id"),
  paymentStatus: text("payment_status"),
  amount: integer("amount"),
  discountAmount: integer("discount_amount").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
  completedAt: timestamp("completed_at"),
});

// Menu items
export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  label: text("label").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Cases - успешные кейсы аудитов
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  siteType: text("site_type").notNull(),
  description: text("description").notNull(),
  beforeScore: integer("before_score").notNull(),
  afterScore: integer("after_score").notNull(),
  issues: text("issues").array(),
  solutions: text("solutions").array(),
  testimonial: text("testimonial"),
  clientName: text("client_name"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

// Promo codes - промокоды со скидками
export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type").notNull(), // 'percent' or 'fixed'
  discountValue: integer("discount_value").notNull(), // percent (1-100) or fixed amount in rubles
  maxUses: integer("max_uses"), // null = unlimited
  currentUses: integer("current_uses").default(0),
  expiresAt: timestamp("expires_at"), // null = never expires
  minOrderAmount: integer("min_order_amount"), // minimum order for promo to apply
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Referral settings - настройки реферальной программы
export const referralSettings = pgTable("referral_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerBonus: integer("referrer_bonus").default(100), // bonus for referrer in rubles
  refereeDiscount: integer("referee_discount").default(10), // discount for new user in percent
  commissionPercent: integer("commission_percent").default(20), // commission percent from orders
  minPayoutAmount: integer("min_payout_amount").default(500), // minimum amount for payout request
  isActive: boolean("is_active").default(true),
});

// Referrals - отслеживание привлеченных пользователей
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull(), // who invited
  refereeId: varchar("referee_id").notNull(), // who was invited
  status: text("status").default("registered"), // registered, ordered, paid
  commissionEarned: integer("commission_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout requests - запросы на выплату
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status").default("pending"), // pending, processing, completed, rejected
  paymentMethod: text("payment_method"), // card, yoomoney, qiwi
  paymentDetails: text("payment_details"), // card number, wallet, etc.
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Notifications - внутренние уведомления
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info"), // info, success, warning, promo
  isRead: boolean("is_read").default(false),
  link: text("link"), // optional link to action
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscriptions - подписки на рассылки и настройки уведомлений
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  emailNews: boolean("email_news").default(true),
  emailPromo: boolean("email_promo").default(true),
  inAppNotifications: boolean("in_app_notifications").default(true),
  emailOrders: boolean("email_orders").default(true),
  emailPayments: boolean("email_payments").default(true),
  emailReferrals: boolean("email_referrals").default(true),
  emailAuditReports: boolean("email_audit_reports").default(true),
  emailPasswordReset: boolean("email_password_reset").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password resets - токены для восстановления пароля
export const passwordResets = pgTable("password_resets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Commission transactions - история начислений комиссии
export const commissions = pgTable("commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  orderId: varchar("order_id").notNull(),
  referralId: varchar("referral_id"),
  amount: integer("amount").notNull(),
  type: text("type").default("referral"), // referral, bonus
  status: text("status").default("pending"), // pending, credited, paid
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================
// NEW TABLES FOR ENHANCED FUNCTIONALITY
// ============================================

// User sites - сайты пользователя для мониторинга
export const userSites = pgTable("user_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  url: text("url").notNull(),
  displayName: text("display_name"),
  overallScore: integer("overall_score"), // 0-100
  law149Status: text("law_149_status").default("unknown"), // ok, warning, critical, unknown
  law152Status: text("law_152_status").default("unknown"),
  law149Score: integer("law_149_score"),
  law152Score: integer("law_152_score"),
  latestAuditId: varchar("latest_audit_id"),
  latestAuditAt: timestamp("latest_audit_at"),
  monitoringEnabled: boolean("monitoring_enabled").default(false),
  mailingEnabled: boolean("mailing_enabled").default(false),
  isVerified: boolean("is_verified").default(false),
  subscriptionId: varchar("subscription_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Site audits - аудиты сайтов
export const siteAudits = pgTable("site_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").notNull(),
  orderId: varchar("order_id"),
  performedBy: varchar("performed_by"), // admin id for manual, null for auto
  source: text("source").default("auto"), // auto, manual, express
  overallScore: integer("overall_score").notNull(),
  law149Score: integer("law_149_score"),
  law152Score: integer("law_152_score"),
  law149Status: text("law_149_status").default("unknown"),
  law152Status: text("law_152_status").default("unknown"),
  status: text("status").default("completed"), // pending, in_progress, completed, reviewed
  summary: text("summary"),
  recommendations: text("recommendations"),
  adminNotes: text("admin_notes"),
  // INN verification fields
  inn: text("inn"), // ИНН организации
  innSource: text("inn_source").default("auto"), // auto, manual
  innVerified: boolean("inn_verified").default(false), // проверен ли в реестре РКН
  rknOperatorStatus: text("rkn_operator_status"), // registered, not_found, pending_check
  followUpStatus: text("follow_up_status"), // pending, scheduled, completed, skipped
  followUpNote: text("follow_up_note"),
  // GigaChat AI analysis
  gigachatAnalysis: jsonb("gigachat_analysis"), // AI анализ соответствия
  gigachatScore: integer("gigachat_score"), // оценка от AI (0-100)
  verificationMethods: text("verification_methods").array(), // используемые методы проверки
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Audit findings - отдельные нарушения
export const auditFindings = pgTable("audit_findings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull(),
  law: text("law").notNull(), // "149-ФЗ" or "152-ФЗ"
  category: text("category").notNull(),
  severity: text("severity").notNull(), // critical, warning, info
  title: text("title").notNull(),
  description: text("description"),
  recommendation: text("recommendation"),
  penalty: text("penalty"),
  status: text("status").default("open"), // open, in_progress, resolved, wont_fix
  marketplaceLink: text("marketplace_link"),
  sortOrder: integer("sort_order").default(0),
});

// Subscription plans - тарифные планы подписок
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  billingCycle: text("billing_cycle").notNull(), // monthly, quarterly, yearly
  auditFrequency: text("audit_frequency").notNull(), // weekly, monthly, quarterly
  maxSites: integer("max_sites").default(1),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
});

// Site subscriptions - подписки на мониторинг сайтов
export const siteSubscriptions = pgTable("site_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  planId: varchar("plan_id").notNull(),
  status: text("status").default("active"), // active, paused, cancelled, expired
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  nextAuditAt: timestamp("next_audit_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support tickets - тикеты поддержки
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  siteId: varchar("site_id"),
  orderId: varchar("order_id"),
  subject: text("subject").notNull(),
  type: text("type").default("general"), // general, audit, payment, technical, complaint
  priority: text("priority").default("normal"), // low, normal, high, urgent
  status: text("status").default("open"), // open, in_progress, waiting_user, resolved, closed
  assignedAdminId: varchar("assigned_admin_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Ticket messages - сообщения в тикетах
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // user, admin, superadmin, system
  message: text("message").notNull(),
  attachments: text("attachments").array(),
  isInternal: boolean("is_internal").default(false), // internal notes visible only to admins
  createdAt: timestamp("created_at").defaultNow(),
});

// =====================================================
// DOCUMENT MANAGEMENT SYSTEM - Документооборот
// =====================================================

// Documents - документы для клиентов
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  documentType: documentTypeEnum("document_type").default("other").notNull(),
  status: documentStatusEnum("status").default("draft").notNull(),
  orderId: varchar("order_id"),
  auditId: varchar("audit_id"),
  clientUserId: varchar("client_user_id"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  assignedManagerId: varchar("assigned_manager_id"),
  assignedLawyerId: varchar("assigned_lawyer_id"),
  currentVersionId: integer("current_version_id"),
  clientCompanyName: text("client_company_name"),
  clientCompanyType: text("client_company_type"),
  clientInn: varchar("client_inn", { length: 12 }),
  clientOgrn: varchar("client_ogrn", { length: 15 }),
  clientKpp: varchar("client_kpp", { length: 9 }),
  clientAddress: text("client_address"),
  clientDirectorName: text("client_director_name"),
  clientDirectorPosition: text("client_director_position"),
  clientPhone: varchar("client_phone", { length: 50 }),
  clientEmail: varchar("client_email", { length: 255 }),
  content: text("content"),
  managerNotes: text("manager_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => [
  index("documents_status_idx").on(table.status),
  index("documents_manager_idx").on(table.assignedManagerId),
  index("documents_lawyer_idx").on(table.assignedLawyerId),
]);

// Document versions - версии документов
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  uploadedByUserId: varchar("uploaded_by_user_id").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Document reviews - ревью документов юристом
export const documentReviews = pgTable("document_reviews", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  versionId: integer("version_id").notNull(),
  reviewerUserId: varchar("reviewer_user_id").notNull(),
  decision: varchar("decision", { length: 20 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =====================================================
// GUIDE KNOWLEDGE BASE - Справочник ФЗ-152 (ВНУТРЕННИЙ!)
// =====================================================

// Guide sections - разделы справочника
export const guideSections = pgTable("guide_sections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  isVisible: boolean("is_visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Guide topics - темы внутри разделов
export const guideTopics = pgTable("guide_topics", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Guide articles - статьи справочника для RAG
export const guideArticles = pgTable("guide_articles", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  status: guideArticleStatusEnum("status").default("draft").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  lawTags: jsonb("law_tags").default([]).$type<string[]>(),
  topicTags: jsonb("topic_tags").default([]).$type<string[]>(),
  audienceTags: jsonb("audience_tags").default([]).$type<string[]>(),
  applicability: jsonb("applicability").default([]).$type<string[]>(),
  bodyBaseMd: text("body_base_md"),
  bodyRegsMd: text("body_regs_md"),
  regsData: jsonb("regs_data"),
  sources: jsonb("sources").default([]).$type<{title: string; url: string}[]>(),
  media: jsonb("media").default({}).$type<{coverImageUrl?: string; gallery?: string[]; videoLinks?: string[]}>(),
  relatedTools: jsonb("related_tools").default([]).$type<number[]>(),
  relatedServices: jsonb("related_services").default([]).$type<string[]>(),
  seo: jsonb("seo").default({}).$type<{title?: string; description?: string; keywords?: string[]; canonical?: string; noindex?: boolean}>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

// =====================================================
// ENHANCED REFERRAL SYSTEM - Расширенная реферальная программа
// =====================================================

// Referral participants - участники реферальной программы
export const referralParticipants = pgTable("referral_participants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  participantType: referralParticipantTypeEnum("participant_type").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  birthDate: varchar("birth_date", { length: 20 }),
  inn: varchar("inn", { length: 15 }).notNull(),
  statusConfirmation: text("status_confirmation"),
  companyName: varchar("company_name", { length: 500 }),
  ogrn: varchar("ogrn", { length: 20 }),
  kpp: varchar("kpp", { length: 15 }),
  legalAddress: text("legal_address"),
  actualAddress: text("actual_address"),
  bankName: varchar("bank_name", { length: 255 }),
  bik: varchar("bik", { length: 15 }),
  bankAccount: varchar("bank_account", { length: 30 }),
  corrAccount: varchar("corr_account", { length: 30 }),
  offerAcceptedAt: timestamp("offer_accepted_at"),
  status: referralParticipantStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  customPercentReward: integer("custom_percent_reward"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom referral links - именные ссылки для партнёров
export const customReferralLinks = pgTable("custom_referral_links", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  customPercent: integer("custom_percent").notNull(),
  earningsTotal: integer("earnings_total").default(0).notNull(),
  earningsPending: integer("earnings_pending").default(0).notNull(),
  earningsPaid: integer("earnings_paid").default(0).notNull(),
  referralsCount: integer("referrals_count").default(0).notNull(),
  clicksCount: integer("clicks_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Referral payouts - заявки на выплату рефералам
export const referralPayouts = pgTable("referral_payouts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  status: referralPayoutStatusEnum("status").default("pending").notNull(),
  paymentDetails: text("payment_details"),
  adminNotes: text("admin_notes"),
  processedById: varchar("processed_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// =====================================================
// AI PROMPTS LIBRARY - Библиотека промптов для ИИ
// =====================================================

export const aiPrompts = pgTable("ai_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: promptCategoryEnum("category").default("other").notNull(),
  promptText: text("prompt_text").notNull(),
  provider: aiProviderEnum("provider").default("gigachat"),
  isSystem: boolean("is_system").default(false), // system prompts can't be deleted
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdById: varchar("created_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// ADMIN NOTIFICATION BADGES - Счётчики уведомлений
// =====================================================

export const adminNotificationCounts = pgTable("admin_notification_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  section: text("section").notNull(), // orders, messages, documents, tickets, express_audits
  unreadCount: integer("unread_count").default(0),
  lastSeenAt: timestamp("last_seen_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================
// DOCUMENT PACKAGES - Пакеты документов для клиентов
// =====================================================

export const documentPackages = pgTable("document_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  orderId: varchar("order_id"),
  clientUserId: varchar("client_user_id"),
  assignedManagerId: varchar("assigned_manager_id"),
  assignedLawyerId: varchar("assigned_lawyer_id"),
  status: documentStatusEnum("status").default("draft").notNull(),
  lawType: text("law_type").default("152-FZ"), // 152-FZ, 149-FZ, both
  documentIds: text("document_ids").array(), // array of document IDs in this package
  managerNotes: text("manager_notes"),
  lawyerNotes: text("lawyer_notes"),
  clientEmail: text("client_email"),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin activity logs - логи действий администраторов
export const adminLogs = pgTable("admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(), // create, update, delete, approve, reject, login, etc.
  entityType: text("entity_type").notNull(), // user, order, audit, payout, ticket, settings, etc.
  entityId: varchar("entity_id"),
  details: jsonb("details"), // additional context
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const ordersRelations = relations(orders, ({ one }) => ({
  package: one(packages, {
    fields: [orders.packageId],
    references: [packages.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  role: true,
  fullName: true,
  phone: true,
  referralCode: true,
  referredBy: true,
  vkId: true,
  yandexId: true,
  avatarUrl: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
});

export const insertFaqItemSchema = createInsertSchema(faqItems).omit({
  id: true,
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  isRead: true,
  isSpam: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  paidAt: true,
  completedAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  currentUses: true,
  createdAt: true,
});

export const insertReferralSettingsSchema = createInsertSchema(referralSettings).omit({
  id: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetSchema = createInsertSchema(passwordResets).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export const insertCommissionSchema = createInsertSchema(commissions).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for new tables
export const insertUserSiteSchema = createInsertSchema(userSites).omit({
  id: true,
  createdAt: true,
  latestAuditId: true,
  latestAuditAt: true,
  overallScore: true,
  law149Status: true,
  law152Status: true,
  law149Score: true,
  law152Score: true,
});

export const insertSiteAuditSchema = createInsertSchema(siteAudits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAuditFindingSchema = createInsertSchema(auditFindings).omit({
  id: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
});

export const insertSiteSubscriptionSchema = createInsertSchema(siteSubscriptions).omit({
  id: true,
  createdAt: true,
  cancelledAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for Document Management System
export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentReviewSchema = createInsertSchema(documentReviews).omit({
  id: true,
  createdAt: true,
});

// Insert schemas for Guide Knowledge Base
export const insertGuideSectionSchema = createInsertSchema(guideSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuideTopicSchema = createInsertSchema(guideTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuideArticleSchema = createInsertSchema(guideArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas for Enhanced Referral System
export const insertReferralParticipantSchema = createInsertSchema(referralParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  offerAcceptedAt: true,
  adminNotes: true,
});

export const insertCustomReferralLinkSchema = createInsertSchema(customReferralLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  earningsTotal: true,
  earningsPending: true,
  earningsPaid: true,
  referralsCount: true,
  clicksCount: true,
});

export const insertReferralPayoutSchema = createInsertSchema(referralPayouts).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

// Insert schemas for AI Prompts and Document Packages
export const insertAiPromptSchema = createInsertSchema(aiPrompts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminNotificationCountSchema = createInsertSchema(adminNotificationCounts).omit({
  id: true,
  updatedAt: true,
});

export const insertDocumentPackageSchema = createInsertSchema(documentPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deliveredAt: true,
});

// User profile update schema
export const updateUserProfileSchema = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  telegramHandle: z.string().optional(),
  vkProfile: z.string().optional(),
  organizationInn: z.string().optional(),
  siteUrl: z.string().url().optional().or(z.literal("")),
});

// User registration schema
export const registerUserSchema = z.object({
  username: z.string().min(3, "Минимум 3 символа"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
  referralCode: z.string().optional(),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type FaqItem = typeof faqItems.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertReferralSettings = z.infer<typeof insertReferralSettingsSchema>;
export type ReferralSettings = typeof referralSettings.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertPasswordReset = z.infer<typeof insertPasswordResetSchema>;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissions.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

// Types for new tables
export type InsertUserSite = z.infer<typeof insertUserSiteSchema>;
export type UserSite = typeof userSites.$inferSelect;
export type InsertSiteAudit = z.infer<typeof insertSiteAuditSchema>;
export type SiteAudit = typeof siteAudits.$inferSelect;
export type InsertAuditFinding = z.infer<typeof insertAuditFindingSchema>;
export type AuditFinding = typeof auditFindings.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSiteSubscription = z.infer<typeof insertSiteSubscriptionSchema>;
export type SiteSubscription = typeof siteSubscriptions.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;

// Types for Document Management System
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentReview = z.infer<typeof insertDocumentReviewSchema>;
export type DocumentReview = typeof documentReviews.$inferSelect;

// Types for Guide Knowledge Base
export type InsertGuideSection = z.infer<typeof insertGuideSectionSchema>;
export type GuideSection = typeof guideSections.$inferSelect;
export type InsertGuideTopic = z.infer<typeof insertGuideTopicSchema>;
export type GuideTopic = typeof guideTopics.$inferSelect;
export type InsertGuideArticle = z.infer<typeof insertGuideArticleSchema>;
export type GuideArticle = typeof guideArticles.$inferSelect;

// Types for Enhanced Referral System
export type InsertReferralParticipant = z.infer<typeof insertReferralParticipantSchema>;
export type ReferralParticipant = typeof referralParticipants.$inferSelect;
export type InsertCustomReferralLink = z.infer<typeof insertCustomReferralLinkSchema>;
export type CustomReferralLink = typeof customReferralLinks.$inferSelect;
export type InsertReferralPayout = z.infer<typeof insertReferralPayoutSchema>;
export type ReferralPayout = typeof referralPayouts.$inferSelect;

// Types for AI Prompts and Document Packages
export type InsertAiPrompt = z.infer<typeof insertAiPromptSchema>;
export type AiPrompt = typeof aiPrompts.$inferSelect;
export type InsertAdminNotificationCount = z.infer<typeof insertAdminNotificationCountSchema>;
export type AdminNotificationCount = typeof adminNotificationCounts.$inferSelect;
export type InsertDocumentPackage = z.infer<typeof insertDocumentPackageSchema>;
export type DocumentPackage = typeof documentPackages.$inferSelect;

// Audit criteria type
export interface AuditCriterion {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  details?: string;
  recommendation?: string;
  penalty?: string;
}

export interface AuditResults {
  criteria: AuditCriterion[];
  totalScore: number;
  overallStatus: 'good' | 'average' | 'critical';
}

// Login schema for validation
export const loginSchema = z.object({
  username: z.string().min(1, "Введите логин"),
  password: z.string().min(1, "Введите пароль"),
});

// Helper function to normalize URL
export function normalizeUrl(input: string): string {
  let url = input.trim().toLowerCase();
  
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  return url;
}

// Audit form schema with flexible URL validation
export const auditFormSchema = z.object({
  siteUrl: z.string()
    .min(1, "Введите URL сайта")
    .transform((val) => normalizeUrl(val))
    .refine((val) => {
      try {
        const url = new URL(val);
        // Check if domain has at least one dot (e.g., example.com)
        return url.hostname.includes('.');
      } catch {
        return false;
      }
    }, "Введите корректный URL сайта"),
  email: z.string().email("Введите корректный email"),
  siteType: z.string().min(1, "Выберите тип сайта"),
  agreePrivacy: z.boolean().refine(val => val === true, "Необходимо ознакомиться с политикой"),
  consent: z.boolean().refine(val => val === true, "Необходимо дать согласие"),
});

export type AuditFormData = z.infer<typeof auditFormSchema>;
