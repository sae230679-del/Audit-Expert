import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, serial, pgEnum, index, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// =====================================================
// Session table (managed by connect-pg-simple)
// Must be defined in Drizzle schema to prevent migration issues
// =====================================================
export const session = pgTable("session", {
  sid: varchar("sid", { length: 255 }).primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => [
  index("IDX_session_expire").on(table.expire),
]);

// =====================================================
// PDN (Personal Data) & Limits Enums
// =====================================================
export const pdnConsentEventTypeEnum = pgEnum("pdn_consent_event_type", ["GIVEN", "WITHDRAWN"]);
export const pdnDestructionStatusEnum = pgEnum("pdn_destruction_status", ["SCHEDULED", "DONE", "LEGAL_HOLD"]);
export const pdnDestructionMethodEnum = pgEnum("pdn_destruction_method", ["anonymize", "delete"]);
export const freeLimitSubjectTypeEnum = pgEnum("free_limit_subject_type", ["user", "anon"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  companyName: varchar("company_name", { length: 255 }),
  inn: varchar("inn", { length: 12 }),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  isMasterAdmin: boolean("is_master_admin").default(false),
  pdnConsentAt: timestamp("pdn_consent_at"),
  marketingConsent: boolean("marketing_consent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  emailVerifiedAt: timestamp("email_verified_at"),
  emailVerifyTokenHash: text("email_verify_token_hash"),
  emailVerifyTokenExpiresAt: timestamp("email_verify_token_expires_at"),
  emailVerifySentAt: timestamp("email_verify_sent_at"),
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
  vkId: varchar("vk_id", { length: 50 }),
  yandexId: varchar("yandex_id", { length: 50 }),
  oauthProvider: varchar("oauth_provider", { length: 20 }),
  avatarUrl: text("avatar_url"),
  // Email notification preferences
  notifyOrders: boolean("notify_orders").default(true),
  notifyPayments: boolean("notify_payments").default(true),
  notifyAuditComplete: boolean("notify_audit_complete").default(true),
  notifyReferral: boolean("notify_referral").default(true),
  notifySupport: boolean("notify_support").default(true),
  notifyMarketing: boolean("notify_marketing").default(false),
  referredByCode: varchar("referred_by_code", { length: 50 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  audits: many(audits),
  payments: many(payments),
}));

export const auditPackages = pgTable("audit_packages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 50 }).default("full_audit").notNull(),
  siteType: varchar("site_type", { length: 100 }),
  price: integer("price").notNull(),
  criteriaCount: integer("criteria_count").notNull(),
  durationMin: integer("duration_min").notNull(),
  durationMax: integer("duration_max").notNull(),
  description: text("description"),
  features: text("features").array(),
  criteriaTemplates: jsonb("criteria_templates"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const auditPackagesRelations = relations(auditPackages, ({ many }) => ({
  audits: many(audits),
}));

export const audits = pgTable("audits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  packageId: integer("package_id").references(() => auditPackages.id).notNull(),
  websiteUrlNormalized: varchar("website_url_normalized", { length: 255 }).notNull(),
  websiteUrlOriginal: varchar("website_url_original", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const auditsRelations = relations(audits, ({ one, many }) => ({
  user: one(users, {
    fields: [audits.userId],
    references: [users.id],
  }),
  package: one(auditPackages, {
    fields: [audits.packageId],
    references: [auditPackages.id],
  }),
  results: many(auditResults),
  reports: many(reports),
}));

export const auditResults = pgTable("audit_results", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => audits.id).notNull(),
  criteriaJson: jsonb("criteria_json").notNull(),
  rknCheckJson: jsonb("rkn_check_json"),
  hostingInfo: jsonb("hosting_info"),
  briefResults: jsonb("brief_results"),
  fullResults: jsonb("full_results"),
  scorePercent: integer("score_percent"),
  severity: varchar("severity", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditResultsRelations = relations(auditResults, ({ one }) => ({
  audit: one(audits, {
    fields: [auditResults.auditId],
    references: [audits.id],
  }),
}));

export const paymentTypeEnum = pgEnum("payment_type", ["auto", "invoice", "installment"]);

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  auditId: integer("audit_id").references(() => audits.id),
  serviceType: varchar("service_type", { length: 50 }).default("audit"),
  toolId: integer("tool_id"),
  amount: integer("amount").notNull(),
  originalAmount: integer("original_amount"),
  discountAmount: integer("discount_amount").default(0),
  promoCodeId: integer("promo_code_id"),
  referralLinkId: integer("referral_link_id"),
  referralCode: varchar("referral_code", { length: 50 }),
  paymentType: paymentTypeEnum("payment_type").default("auto"),
  installmentMonths: integer("installment_months"),
  loanOption: varchar("loan_option", { length: 50 }),
  currency: varchar("currency", { length: 3 }).default("RUB").notNull(),
  yandexPaymentId: varchar("yandex_payment_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  description: text("description"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  audit: one(audits, {
    fields: [payments.auditId],
    references: [audits.id],
  }),
}));

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => audits.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  contentHtml: text("content_html"),
  pdfUrl: varchar("pdf_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  audit: one(audits, {
    fields: [reports.auditId],
    references: [audits.id],
  }),
}));

// Theme preset type definitions
export const themeColorsSchema = z.object({
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  background: z.string(),
  foreground: z.string(),
  card: z.string(),
  cardForeground: z.string(),
  muted: z.string(),
  mutedForeground: z.string(),
  accent: z.string(),
  accentForeground: z.string(),
  destructive: z.string(),
  destructiveForeground: z.string(),
  border: z.string(),
  sidebar: z.string(),
  sidebarForeground: z.string(),
  sidebarPrimary: z.string(),
  sidebarAccent: z.string(),
});

export const themeLayoutSchema = z.object({
  type: z.enum(["sidebar", "top-nav"]),
  sidebarWidth: z.string().optional(),
  headerHeight: z.string().optional(),
  borderRadius: z.string().optional(),
});

export const themeFooterSchema = z.object({
  columns: z.array(z.object({
    title: z.string(),
    links: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })),
  })),
  showSocial: z.boolean(),
  showPaymentMethods: z.boolean(),
  copyrightText: z.string().optional(),
});

export const themeDashboardSchema = z.object({
  cardStyle: z.enum(["flat", "elevated", "bordered"]),
  statsLayout: z.enum(["grid", "list"]),
  showQuickActions: z.boolean(),
  accentColors: z.object({
    success: z.string(),
    warning: z.string(),
    error: z.string(),
    info: z.string(),
  }).optional(),
});

export const themePresetSchema = z.object({
  colors: themeColorsSchema,
  darkColors: themeColorsSchema.optional(),
  layout: themeLayoutSchema,
  footer: themeFooterSchema.optional(),
  dashboard: themeDashboardSchema.optional(),
});

export type ThemeColors = z.infer<typeof themeColorsSchema>;
export type ThemeLayout = z.infer<typeof themeLayoutSchema>;
export type ThemeFooter = z.infer<typeof themeFooterSchema>;
export type ThemeDashboard = z.infer<typeof themeDashboardSchema>;
export type ThemePreset = z.infer<typeof themePresetSchema>;

export const designThemes = pgTable("design_themes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  description: text("description"),
  previewImage: varchar("preview_image", { length: 500 }),
  preset: jsonb("preset").notNull().$type<ThemePreset>(),
  isActive: boolean("is_active").default(false).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const secureSettings = pgTable("secure_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  encryptedValue: text("encrypted_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export type SecureSetting = typeof secureSettings.$inferSelect;

// OAuth Settings - настройки авторизации через соцсети
export const oauthSettings = pgTable("oauth_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().unique(), // 'yandex', 'vk'
  enabled: boolean("enabled").default(false).notNull(),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
});

export const insertOAuthSettingSchema = createInsertSchema(oauthSettings).omit({
  id: true,
  updatedAt: true,
});

export type OAuthSetting = typeof oauthSettings.$inferSelect;
export type InsertOAuthSetting = z.infer<typeof insertOAuthSettingSchema>;

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: integer("resource_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id),
  referralCode: varchar("referral_code", { length: 50 }).notNull().unique(),
  earningsTotal: integer("earnings_total").default(0).notNull(),
  earningsPending: integer("earnings_pending").default(0).notNull(),
  earningsPaid: integer("earnings_paid").default(0).notNull(),
  referralsCount: integer("referrals_count").default(0).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =====================================================
// Referral Settings - настройки реферальной программы (админ)
// =====================================================
export const referralSettings = pgTable("referral_settings", {
  id: serial("id").primaryKey(),
  percentReward: integer("percent_reward").default(10).notNull(),
  fixedReward: integer("fixed_reward").default(0).notNull(),
  bonusReward: integer("bonus_reward").default(0).notNull(),
  minPayoutAmount: integer("min_payout_amount").default(1000).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  offerText: text("offer_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export type ReferralSettings = typeof referralSettings.$inferSelect;

export const insertReferralSettingsSchema = createInsertSchema(referralSettings).omit({
  id: true,
  updatedAt: true,
});

export type InsertReferralSettings = z.infer<typeof insertReferralSettingsSchema>;

// =====================================================
// Referral Participant Types
// =====================================================
export const referralParticipantTypeEnum = pgEnum("referral_participant_type", [
  "self_employed", "ip", "ooo"
]);

export const referralParticipantStatusEnum = pgEnum("referral_participant_status", [
  "pending", "approved", "rejected"
]);

// =====================================================
// Referral Participants - регистрация участников программы
// =====================================================
export const referralParticipants = pgTable("referral_participants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
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
}, (table) => [
  index("referral_participants_user_id_idx").on(table.userId),
]);

// =====================================================
// Custom Referral Links - именные реферальные ссылки (создаются админом)
// =====================================================
export const customReferralLinks = pgTable("custom_referral_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
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
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("custom_referral_links_user_id_idx").on(table.userId),
  index("custom_referral_links_code_idx").on(table.code),
]);

export type CustomReferralLink = typeof customReferralLinks.$inferSelect;

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

export type InsertCustomReferralLink = z.infer<typeof insertCustomReferralLinkSchema>;

// =====================================================
// Custom Referral Transactions - транзакции по именным ссылкам
// =====================================================
export const customReferralTransactions = pgTable("custom_referral_transactions", {
  id: serial("id").primaryKey(),
  customLinkId: integer("custom_link_id").references(() => customReferralLinks.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id),
  paymentId: integer("payment_id").references(() => payments.id),
  auditId: integer("audit_id").references(() => audits.id),
  amount: integer("amount").notNull(),
  percentUsed: integer("percent_used").notNull(),
  siteUrl: text("site_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("custom_referral_transactions_link_id_idx").on(table.customLinkId),
]);

export type CustomReferralTransaction = typeof customReferralTransactions.$inferSelect;

export const insertCustomReferralTransactionSchema = createInsertSchema(customReferralTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCustomReferralTransaction = z.infer<typeof insertCustomReferralTransactionSchema>;

export type ReferralParticipant = typeof referralParticipants.$inferSelect;

export const insertReferralParticipantSchema = createInsertSchema(referralParticipants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  offerAcceptedAt: true,
  adminNotes: true,
});

export type InsertReferralParticipant = z.infer<typeof insertReferralParticipantSchema>;

// =====================================================
// Referral Payout Status
// =====================================================
export const referralPayoutStatusEnum = pgEnum("referral_payout_status", [
  "pending", "processing", "completed", "rejected"
]);

// =====================================================
// Referral Payouts - заявки на выплату
// =====================================================
export const referralPayouts = pgTable("referral_payouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  status: referralPayoutStatusEnum("status").default("pending").notNull(),
  paymentDetails: text("payment_details"),
  adminNotes: text("admin_notes"),
  processedById: integer("processed_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (table) => [
  index("referral_payouts_user_id_idx").on(table.userId),
  index("referral_payouts_status_idx").on(table.status),
]);

export type ReferralPayout = typeof referralPayouts.$inferSelect;

export const insertReferralPayoutSchema = createInsertSchema(referralPayouts).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  status: true,
  adminNotes: true,
  processedById: true,
});

export type InsertReferralPayout = z.infer<typeof insertReferralPayoutSchema>;

// =====================================================
// Referral Transactions - история начислений
// =====================================================
export const referralTransactions = pgTable("referral_transactions", {
  id: serial("id").primaryKey(),
  referralId: integer("referral_id").references(() => referrals.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  paymentId: integer("payment_id").references(() => payments.id),
  amount: integer("amount").notNull(),
  percentUsed: integer("percent_used"),
  fixedUsed: integer("fixed_used"),
  bonusUsed: integer("bonus_used"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("referral_transactions_referral_id_idx").on(table.referralId),
]);

export type ReferralTransaction = typeof referralTransactions.$inferSelect;

export const insertReferralTransactionSchema = createInsertSchema(referralTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertReferralTransaction = z.infer<typeof insertReferralTransactionSchema>;

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 20 }).default("percent").notNull(),
  discountPercent: integer("discount_percent"),
  discountAmount: integer("discount_amount"),
  appliesTo: varchar("applies_to", { length: 20 }).default("all").notNull(),
  appliesToIds: integer("applies_to_ids").array(),
  maxUses: integer("max_uses").default(1000),
  usedCount: integer("used_count").default(0).notNull(),
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validTo: timestamp("valid_to"),
  validDurationDays: integer("valid_duration_days"),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const promoCodeRedemptions = pgTable("promo_code_redemptions", {
  id: serial("id").primaryKey(),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  paymentId: integer("payment_id").references(() => payments.id),
  originalAmount: integer("original_amount").notNull(),
  discountedAmount: integer("discounted_amount").notNull(),
  appliedDiscount: integer("applied_discount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  auditId: integer("audit_id").references(() => audits.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  signMethod: varchar("sign_method", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  signedAt: timestamp("signed_at"),
  documentUrl: varchar("document_url", { length: 255 }),
  emailConfirmationToken: varchar("email_confirmation_token", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publicAudits = pgTable("public_audits", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  websiteUrl: varchar("website_url", { length: 255 }).notNull(),
  websiteUrlNormalized: varchar("website_url_normalized", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("processing").notNull(),
  stageIndex: integer("stage_index").default(0).notNull(),
  passedCount: integer("passed_count").default(0).notNull(),
  warningCount: integer("warning_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  scorePercent: integer("score_percent"),
  severity: varchar("severity", { length: 10 }),
  summaryJson: jsonb("summary_json"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userId: integer("user_id").references(() => users.id),
  fullReportPurchased: boolean("full_report_purchased").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rknRegistryCache = pgTable("rkn_registry_cache", {
  id: serial("id").primaryKey(),
  inn: varchar("inn", { length: 20 }).notNull().unique(),
  companyName: varchar("company_name", { length: 500 }),
  registrationNumber: varchar("registration_number", { length: 50 }),
  registrationDate: varchar("registration_date", { length: 20 }),
  isRegistered: boolean("is_registered").default(false).notNull(),
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
  rawData: jsonb("raw_data"),
});

export type RknRegistryEntry = typeof rknRegistryCache.$inferSelect;

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  bannerImageUrl: text("banner_image_url"),
  ctaText: varchar("cta_text", { length: 100 }),
  ctaLink: varchar("cta_link", { length: 255 }),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  discountText: varchar("discount_text", { length: 100 }),
  showPopup: boolean("show_popup").default(true).notNull(),
  showInMenu: boolean("show_in_menu").default(true).notNull(),
  showOnLanding: boolean("show_on_landing").default(false).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  showCountdown: boolean("show_countdown").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export const insertPromotionSchema = createInsertSchema(promotions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;

// =====================================================
// Заказы полных отчётов (после экспресс-проверки)
// =====================================================
export const expressReportOrderStatusEnum = pgEnum("express_report_order_status", ["pending", "paid", "processing", "completed", "cancelled", "refunded"]);

export const expressReportOrders = pgTable("express_report_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  socialNetwork: varchar("social_network", { length: 50 }),
  socialContact: varchar("social_contact", { length: 255 }),
  messengerContact: varchar("messenger_contact", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 500 }).notNull(),
  inn: varchar("inn", { length: 15 }),
  isIndividual: boolean("is_individual").default(false),
  price: integer("price").notNull(),
  status: expressReportOrderStatusEnum("status").default("pending").notNull(),
  paymentId: varchar("payment_id", { length: 100 }),
  briefResultsSnapshot: jsonb("brief_results_snapshot"),
  adminNotes: text("admin_notes"),
  reportFileUrl: text("report_file_url"),
  privacyConsent: boolean("privacy_consent").default(false).notNull(),
  pdnConsent: boolean("pdn_consent").default(false).notNull(),
  offerConsent: boolean("offer_consent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
  completedAt: timestamp("completed_at"),
});

export type ExpressReportOrder = typeof expressReportOrders.$inferSelect;
export const insertExpressReportOrderSchema = createInsertSchema(expressReportOrders).omit({ 
  id: true, 
  createdAt: true, 
  paidAt: true, 
  completedAt: true,
  status: true,
});
export type InsertExpressReportOrder = z.infer<typeof insertExpressReportOrderSchema>;

// =====================================================
// Индивидуальные заказы (свободная форма)
// =====================================================
export const individualOrderStatusEnum = pgEnum("individual_order_status", ["new", "contacted", "in_progress", "completed", "cancelled"]);

export const individualOrders = pgTable("individual_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  socialNetwork: varchar("social_network", { length: 50 }),
  socialContact: varchar("social_contact", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 500 }),
  inn: varchar("inn", { length: 15 }),
  isIndividual: boolean("is_individual").default(false),
  message: text("message"),
  status: individualOrderStatusEnum("status").default("new").notNull(),
  adminNotes: text("admin_notes"),
  privacyConsent: boolean("privacy_consent").default(false).notNull(),
  pdnConsent: boolean("pdn_consent").default(false).notNull(),
  offerConsent: boolean("offer_consent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IndividualOrder = typeof individualOrders.$inferSelect;
export const insertIndividualOrderSchema = createInsertSchema(individualOrders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  status: true,
});
export type InsertIndividualOrder = z.infer<typeof insertIndividualOrderSchema>;

// =====================================================
// Заявки на полный аудит сайта
// =====================================================
export const fullAuditOrderStatusEnum = pgEnum("full_audit_order_status", ["pending", "in_progress", "completed", "cancelled"]);

export const fullAuditOrders = pgTable("full_audit_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  socialNetwork: varchar("social_network", { length: 50 }),
  messengerContact: varchar("messenger_contact", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  websiteUrl: varchar("website_url", { length: 500 }).notNull(),
  inn: varchar("inn", { length: 15 }),
  isIndividual: boolean("is_individual").default(false),
  packageType: varchar("package_type", { length: 100 }),
  status: fullAuditOrderStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  privacyConsent: boolean("privacy_consent").default(false).notNull(),
  pdnConsent: boolean("pdn_consent").default(false).notNull(),
  offerConsent: boolean("offer_consent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type FullAuditOrder = typeof fullAuditOrders.$inferSelect;
export const insertFullAuditOrderSchema = createInsertSchema(fullAuditOrders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  status: true,
});
export type InsertFullAuditOrder = z.infer<typeof insertFullAuditOrderSchema>;

export const promotionOrderStatusEnum = pgEnum("promotion_order_status", ["pending", "processing", "completed", "cancelled"]);

export const promotionOrders = pgTable("promotion_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  promotionCode: varchar("promotion_code", { length: 100 }).notNull(),
  promotionTitle: varchar("promotion_title", { length: 500 }).notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  socialNetwork: varchar("social_network", { length: 50 }),
  messengerContact: varchar("messenger_contact", { length: 255 }),
  websiteUrl: varchar("website_url", { length: 500 }).notNull(),
  inn: varchar("inn", { length: 15 }),
  status: promotionOrderStatusEnum("status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  privacyConsent: boolean("privacy_consent").default(false).notNull(),
  pdnConsent: boolean("pdn_consent").default(false).notNull(),
  offerConsent: boolean("offer_consent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PromotionOrder = typeof promotionOrders.$inferSelect;
export const insertPromotionOrderSchema = createInsertSchema(promotionOrders).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  status: true,
});
export type InsertPromotionOrder = z.infer<typeof insertPromotionOrderSchema>;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().optional(),
  privacyConsent: z.boolean().refine(val => val === true, {
    message: "Необходимо ознакомиться с политикой конфиденциальности",
  }),
  pdnConsent: z.boolean().refine(val => val === true, {
    message: "Необходимо согласие на обработку персональных данных",
  }),
  offerConsent: z.boolean().refine(val => val === true, {
    message: "Необходимо принять условия договора оферты",
  }),
  marketingConsent: z.boolean().optional().default(false),
});

export const insertAuditPackageSchema = createInsertSchema(auditPackages).omit({
  id: true,
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
});

export const createAuditSchema = z.object({
  websiteUrl: z.string().min(1, "Website URL is required"),
  packageType: z.string().min(1, "Package type is required"),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const manualInvoiceStatusEnum = pgEnum("manual_invoice_status", [
  "pending",
  "contract_sent",
  "contract_signed",
  "invoice_sent",
  "paid",
  "cancelled",
]);

export const manualInvoices = pgTable("manual_invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productType: varchar("product_type", { length: 50 }).notNull(),
  productId: integer("product_id"),
  productName: varchar("product_name", { length: 255 }),
  amount: integer("amount").notNull(),
  originalAmount: integer("original_amount"),
  discountAmount: integer("discount_amount").default(0),
  promoCodeId: integer("promo_code_id"),
  referralCode: varchar("referral_code", { length: 50 }),
  status: manualInvoiceStatusEnum("status").default("pending").notNull(),
  contractSigned: boolean("contract_signed").default(false),
  contractSignedAt: timestamp("contract_signed_at"),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  invoiceSentAt: timestamp("invoice_sent_at"),
  paidAt: timestamp("paid_at"),
  paymentId: integer("payment_id"),
  adminNotes: text("admin_notes"),
  customerNotes: text("customer_notes"),
  companyName: varchar("company_name", { length: 255 }),
  companyInn: varchar("company_inn", { length: 12 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManualInvoiceSchema = createInsertSchema(manualInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ManualInvoice = typeof manualInvoices.$inferSelect;
export type InsertManualInvoice = z.infer<typeof insertManualInvoiceSchema>;

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type AuditPackage = typeof auditPackages.$inferSelect;
export type InsertAuditPackage = z.infer<typeof insertAuditPackageSchema>;

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
export type CreateAuditInput = z.infer<typeof createAuditSchema>;

export type AuditResult = typeof auditResults.$inferSelect;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type DesignTheme = typeof designThemes.$inferSelect;

export const insertDesignThemeSchema = createInsertSchema(designThemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDesignTheme = z.infer<typeof insertDesignThemeSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;

export type Referral = typeof referrals.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type PromoCodeRedemption = typeof promoCodeRedemptions.$inferSelect;
export type Contract = typeof contracts.$inferSelect;

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  earningsTotal: true,
});

export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({
  id: true,
  createdAt: true,
  usedCount: true,
}).extend({
  discountType: z.enum(["percent", "amount"]).default("percent"),
  appliesTo: z.enum(["all", "packages", "reports"]).default("all"),
  maxUses: z.number().min(1).max(1000).optional(),
  validDurationDays: z.number().min(1).max(30).optional().nullable(),
});

export const insertPromoCodeRedemptionSchema = createInsertSchema(promoCodeRedemptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPromoCodeRedemption = z.infer<typeof insertPromoCodeRedemptionSchema>;

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type InsertContract = z.infer<typeof insertContractSchema>;

export const insertPublicAuditSchema = createInsertSchema(publicAudits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type PublicAudit = typeof publicAudits.$inferSelect;
export type InsertPublicAudit = z.infer<typeof insertPublicAuditSchema>;

// Login OTP codes for two-factor authentication
export const loginOtpCodes = pgTable("login_otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoginOtpSchema = createInsertSchema(loginOtpCodes).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type LoginOtpCode = typeof loginOtpCodes.$inferSelect;
export type InsertLoginOtp = z.infer<typeof insertLoginOtpSchema>;

export type UserWithStats = User & {
  auditCount?: number;
  totalSpent?: number;
};

export type AuditWithDetails = Audit & {
  package?: AuditPackage;
  results?: AuditResult[];
  reports?: Report[];
};

export type CriteriaResult = {
  name: string;
  status: "passed" | "warning" | "failed" | "pending";
  description: string;
  details?: string;
  evidence?: string;
};

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// =====================================================
// PDN Consent Events - tracks user consent given/withdrawn
// =====================================================
export const pdnConsentEvents = pgTable("pdn_consent_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  eventType: pdnConsentEventTypeEnum("event_type").notNull(),
  eventAt: timestamp("event_at", { withTimezone: true }).defaultNow().notNull(),
  documentVersion: text("document_version").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  source: text("source").notNull(), // 'register' | 'checkout' | 'lk'
  meta: jsonb("meta").default({}).notNull(),
}, (table) => [
  index("pdn_consent_user_event_idx").on(table.userId, table.eventType, table.eventAt),
]);

export const pdnConsentEventsRelations = relations(pdnConsentEvents, ({ one }) => ({
  user: one(users, {
    fields: [pdnConsentEvents.userId],
    references: [users.id],
  }),
}));

// =====================================================
// PDN Destruction Acts - records of actual data destruction
// =====================================================
export const pdnDestructionActs = pgTable("pdn_destruction_acts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  method: pdnDestructionMethodEnum("method").notNull(),
  summary: text("summary").notNull(),
  operatorUserId: integer("operator_user_id").references(() => users.id, { onDelete: "set null" }),
  details: jsonb("details").default({}).notNull(),
});

export const pdnDestructionActsRelations = relations(pdnDestructionActs, ({ one }) => ({
  user: one(users, {
    fields: [pdnDestructionActs.userId],
    references: [users.id],
  }),
  operator: one(users, {
    fields: [pdnDestructionActs.operatorUserId],
    references: [users.id],
  }),
}));

// =====================================================
// PDN Destruction Tasks - scheduled destruction after consent withdrawal
// =====================================================
export const pdnDestructionTasks = pgTable("pdn_destruction_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: pdnDestructionStatusEnum("status").default("SCHEDULED").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  doneAt: timestamp("done_at", { withTimezone: true }),
  legalHoldReason: text("legal_hold_reason"),
  destructionActId: integer("destruction_act_id").references(() => pdnDestructionActs.id, { onDelete: "set null" }),
  meta: jsonb("meta").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pdn_tasks_status_scheduled_idx").on(table.status, table.scheduledAt),
  index("pdn_tasks_user_idx").on(table.userId),
]);

export const pdnDestructionTasksRelations = relations(pdnDestructionTasks, ({ one }) => ({
  user: one(users, {
    fields: [pdnDestructionTasks.userId],
    references: [users.id],
  }),
  destructionAct: one(pdnDestructionActs, {
    fields: [pdnDestructionTasks.destructionActId],
    references: [pdnDestructionActs.id],
  }),
}));

// =====================================================
// Free Express Limit Events - tracks usage of free express checks
// =====================================================
export const freeExpressLimitEvents = pgTable("free_express_limit_events", {
  id: serial("id").primaryKey(),
  subjectType: freeLimitSubjectTypeEnum("subject_type").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  anonHash: text("anon_hash"), // sha256(ip + '|' + user-agent)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  meta: jsonb("meta").default({}).notNull(),
}, (table) => [
  index("free_limit_user_idx").on(table.subjectType, table.userId, table.createdAt),
  index("free_limit_anon_idx").on(table.subjectType, table.anonHash, table.createdAt),
]);

export const freeExpressLimitEventsRelations = relations(freeExpressLimitEvents, ({ one }) => ({
  user: one(users, {
    fields: [freeExpressLimitEvents.userId],
    references: [users.id],
  }),
}));

// =====================================================
// SEO Pages - dynamic SEO-optimized content pages
// =====================================================
export const seoPages = pgTable("seo_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  h1: text("h1").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // markdown
  isActive: boolean("is_active").default(true).notNull(),
  meta: jsonb("meta").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// =====================================================
// Telegram Groups - for order notifications
// =====================================================
export const telegramGroups = pgTable("telegram_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  botToken: text("bot_token").notNull(),
  chatId: text("chat_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notifyExpressReport: boolean("notify_express_report").default(true).notNull(),
  notifyFullAudit: boolean("notify_full_audit").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTelegramGroupSchema = createInsertSchema(telegramGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TelegramGroup = typeof telegramGroups.$inferSelect;
export type InsertTelegramGroup = z.infer<typeof insertTelegramGroupSchema>;

// =====================================================
// User Messages - notifications and messages for users
// =====================================================
export const messageTypeEnum = pgEnum("message_type", [
  "system",           // системные уведомления
  "referral",         // реферальная программа
  "promotion",        // акции и скидки
  "news",             // новости
  "order",            // статус заявки
  "payment",          // платежи
  "audit",            // результаты аудитов
  "support",          // поддержка
]);

export const userMessages = pgTable("user_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: messageTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_user_messages_user_id").on(table.userId),
  index("idx_user_messages_is_read").on(table.isRead),
]);

export const insertUserMessageSchema = createInsertSchema(userMessages).omit({
  id: true,
  createdAt: true,
});

export type UserMessage = typeof userMessages.$inferSelect;
export type InsertUserMessage = z.infer<typeof insertUserMessageSchema>;

// =====================================================
// Support Tickets (обращения в поддержку)
// =====================================================
export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open",       // открыто
  "in_progress", // в работе
  "resolved",   // решено
  "closed",     // закрыто
]);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: supportTicketStatusEnum("status").default("open").notNull(),
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  respondedBy: integer("responded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_support_tickets_user_id").on(table.userId),
  index("idx_support_tickets_status").on(table.status),
]);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  status: true,
  adminResponse: true,
  respondedAt: true,
  respondedBy: true,
  createdAt: true,
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

// =====================================================
// New Types
// =====================================================
export type PdnConsentEvent = typeof pdnConsentEvents.$inferSelect;
export type PdnDestructionAct = typeof pdnDestructionActs.$inferSelect;
export type PdnDestructionTask = typeof pdnDestructionTasks.$inferSelect;
export type FreeExpressLimitEvent = typeof freeExpressLimitEvents.$inferSelect;
export type SeoPage = typeof seoPages.$inferSelect;

export const insertPdnConsentEventSchema = createInsertSchema(pdnConsentEvents).omit({
  id: true,
  eventAt: true,
});

export const insertSeoPageSchema = createInsertSchema(seoPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPdnConsentEvent = z.infer<typeof insertPdnConsentEventSchema>;
export type InsertSeoPage = z.infer<typeof insertSeoPageSchema>;

// =====================================================
// Hosting Check Types (для проверки хостинга РФ)
// =====================================================
export const hostingStatusSchema = z.enum(["ru", "foreign", "unknown"]);

export const hostingAiResultSchema = z.object({
  used: z.boolean(),
  status: hostingStatusSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  note: z.string().optional(),
});

export const hostingInfoSchema = z.object({
  status: hostingStatusSchema,
  confidence: z.number().min(0).max(1),
  ips: z.array(z.string()),
  providerGuess: z.string().nullable(),
  evidence: z.array(z.string()),
  ai: hostingAiResultSchema,
});

export type HostingStatus = z.infer<typeof hostingStatusSchema>;
export type HostingAiResult = z.infer<typeof hostingAiResultSchema>;
export type HostingInfo = z.infer<typeof hostingInfoSchema>;

// =====================================================
// Brief Results (экспресс-проверка) - структурированный JSON
// =====================================================
export const lawRefSchema = z.object({
  act: z.string(),
  ref: z.string(),
});

export const briefHighlightSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ok", "warn", "fail", "na"]),
  severity: z.enum(["critical", "medium", "low", "info"]),
  summary: z.string(),
  howToFixShort: z.string().optional(),
  law: z.array(lawRefSchema).optional(),
  penaltyMinRub: z.number().optional(),
  penaltyMaxRub: z.number().optional(),
  koapArticle: z.string().optional(),
});

export const briefScoreSchema = z.object({
  percent: z.number().min(0).max(100),
  severity: z.enum(["critical", "high", "medium", "low", "excellent"]),
  totals: z.object({
    checks: z.number(),
    ok: z.number(),
    warn: z.number(),
    fail: z.number(),
    na: z.number(),
  }),
});

export const briefCtaSchema = z.object({
  fullReportPriceRub: z.number(),
  fullReportIncludes: z.array(z.string()),
});

export const briefPenaltySummarySchema = z.object({
  citizenMinRub: z.number(),
  citizenMaxRub: z.number(),
  ipMinRub: z.number(),
  ipMaxRub: z.number(),
  legalEntityMinRub: z.number(),
  legalEntityMaxRub: z.number(),
  violationsCount: z.number(),
});

export const briefResultsSchema = z.object({
  version: z.string().default("1.0"),
  reportType: z.literal("express"),
  generatedAt: z.string(),
  site: z.object({
    url: z.string(),
    domain: z.string(),
  }),
  score: briefScoreSchema,
  hosting: hostingInfoSchema,
  highlights: z.array(briefHighlightSchema),
  cta: briefCtaSchema,
  penaltySummary: briefPenaltySummarySchema.optional(),
});

export type LawRef = z.infer<typeof lawRefSchema>;
export type BriefHighlight = z.infer<typeof briefHighlightSchema>;
export type BriefScore = z.infer<typeof briefScoreSchema>;
export type BriefCta = z.infer<typeof briefCtaSchema>;
export type BriefPenaltySummary = z.infer<typeof briefPenaltySummarySchema>;
export type BriefResults = z.infer<typeof briefResultsSchema>;

// =====================================================
// Full Results (полный отчёт за 900₽) - структурированный JSON
// =====================================================
export const possibleLiabilitySchema = z.object({
  type: z.enum(["administrative", "civil", "criminal"]),
  note: z.string(),
});

export const fullCheckSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(["ok", "warn", "fail", "na"]),
  severity: z.enum(["critical", "medium", "low", "info"]),
  evidence: z.array(z.string()).optional(),
  risk: z.string().optional(),
  howToFix: z.array(z.string()).optional(),
  law: z.array(lawRefSchema).optional(),
  possibleLiability: z.array(possibleLiabilitySchema).optional(),
  links: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).optional(),
});

export const fullSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  checks: z.array(fullCheckSchema),
});

export const fullRecommendationsSchema = z.object({
  priority1: z.array(z.string()),
  priority2: z.array(z.string()),
  priority3: z.array(z.string()),
});

export const fullResultsSchema = z.object({
  version: z.string().default("1.0"),
  reportType: z.literal("full"),
  generatedAt: z.string(),
  site: z.object({
    url: z.string(),
    domain: z.string(),
    snapshot: z.object({
      checkedPaths: z.array(z.string()).optional(),
      responseTimeMs: z.number().optional(),
      statusCodes: z.array(z.object({
        path: z.string(),
        code: z.number(),
      })).optional(),
    }).optional(),
  }),
  score: briefScoreSchema,
  hosting: hostingInfoSchema,
  sections: z.array(fullSectionSchema),
  recommendations: fullRecommendationsSchema,
});

export type PossibleLiability = z.infer<typeof possibleLiabilitySchema>;
export type FullCheck = z.infer<typeof fullCheckSchema>;
export type FullSection = z.infer<typeof fullSectionSchema>;
export type FullRecommendations = z.infer<typeof fullRecommendationsSchema>;
export type FullResults = z.infer<typeof fullResultsSchema>;

// =====================================================
// Payment Gateways (v2.1)
// =====================================================
export const paymentGateways = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  isDefault: boolean("is_default").default(false),
  config: jsonb("config"),
  commissionPercent: integer("commission_percent").default(0),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPaymentGatewaySchema = createInsertSchema(paymentGateways).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPaymentGateway = z.infer<typeof insertPaymentGatewaySchema>;
export type PaymentGateway = typeof paymentGateways.$inferSelect;

// =====================================================
// Service Configs (v2.1) - 3 main services
// =====================================================
export const serviceConfigs = pgTable("service_configs", {
  id: serial("id").primaryKey(),
  serviceKey: varchar("service_key", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  basePrice: integer("base_price").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  config: jsonb("config"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertServiceConfigSchema = createInsertSchema(serviceConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServiceConfig = z.infer<typeof insertServiceConfigSchema>;
export type ServiceConfig = typeof serviceConfigs.$inferSelect;

// =====================================================
// Tool Configs (v2.1) - 10 tools
// =====================================================
export const toolConfigs = pgTable("tool_configs", {
  id: serial("id").primaryKey(),
  toolKey: varchar("tool_key", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").default(10).notNull(),
  isFree: boolean("is_free").default(false),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  usageCount: integer("usage_count").default(0),
  config: jsonb("config"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertToolConfigSchema = createInsertSchema(toolConfigs).omit({ id: true, createdAt: true, updatedAt: true, usageCount: true });
export type InsertToolConfig = z.infer<typeof insertToolConfigSchema>;
export type ToolConfig = typeof toolConfigs.$inferSelect;

// =====================================================
// Tool Usage (v2.1) - history of tool usage
// =====================================================
export const toolUsage = pgTable("tool_usage", {
  id: serial("id").primaryKey(),
  toolKey: varchar("tool_key", { length: 50 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 255 }),
  inputData: jsonb("input_data"),
  outputData: jsonb("output_data"),
  paymentId: integer("payment_id").references(() => payments.id),
  isPaid: boolean("is_paid").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("tool_usage_tool_key_idx").on(table.toolKey),
  index("tool_usage_user_id_idx").on(table.userId),
]);

export const insertToolUsageSchema = createInsertSchema(toolUsage).omit({ id: true, createdAt: true });
export type InsertToolUsage = z.infer<typeof insertToolUsageSchema>;
export type ToolUsage = typeof toolUsage.$inferSelect;

// =====================================================
// Guide Sections - разделы справочника (9 секций)
// =====================================================
export const guideSections = pgTable("guide_sections", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Lucide icon name
  isVisible: boolean("is_visible").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("guide_sections_slug_idx").on(table.slug),
]);

export const insertGuideSectionSchema = createInsertSchema(guideSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GuideSection = typeof guideSections.$inferSelect;
export type InsertGuideSection = z.infer<typeof insertGuideSectionSchema>;

// =====================================================
// Guide Topics - темы внутри разделов
// =====================================================
export const guideTopics = pgTable("guide_topics", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => guideSections.id).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("guide_topics_section_idx").on(table.sectionId),
  index("guide_topics_slug_idx").on(table.slug),
]);

export const insertGuideTopicSchema = createInsertSchema(guideTopics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GuideTopic = typeof guideTopics.$inferSelect;
export type InsertGuideTopic = z.infer<typeof insertGuideTopicSchema>;

// =====================================================
// Guide Articles - SEO справочник
// =====================================================
export const guideArticleStatusEnum = pgEnum("guide_article_status", ["draft", "published", "archived"]);

export const guideArticles = pgTable("guide_articles", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => guideTopics.id), // FK to topic (nullable for migration)
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
}, (table) => [
  index("guide_articles_topic_idx").on(table.topicId),
  index("guide_articles_status_idx").on(table.status),
  index("guide_articles_published_idx").on(table.publishedAt),
]);

export const insertGuideArticleSchema = createInsertSchema(guideArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GuideArticle = typeof guideArticles.$inferSelect;
export type InsertGuideArticle = z.infer<typeof insertGuideArticleSchema>;

// =====================================================
// Guide Events - аналитика справочника
// =====================================================
export const guideEventTypeEnum = pgEnum("guide_event_type", [
  "page_view", "scroll_25", "scroll_50", "scroll_75", "scroll_90", 
  "read_end", "cta_click", "source_click", "mode_switch"
]);

export const guideEvents = pgTable("guide_events", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  visitorId: varchar("visitor_id", { length: 100 }),
  slug: varchar("slug", { length: 255 }).notNull(),
  mode: varchar("mode", { length: 10 }),
  eventType: guideEventTypeEnum("event_type").notNull(),
  eventValue: jsonb("event_value").default({}),
}, (table) => [
  index("guide_events_slug_idx").on(table.slug),
  index("guide_events_type_idx").on(table.eventType),
  index("guide_events_created_idx").on(table.createdAt),
]);

export const insertGuideEventSchema = createInsertSchema(guideEvents).omit({
  id: true,
  createdAt: true,
});

export type GuideEvent = typeof guideEvents.$inferSelect;
export type InsertGuideEvent = z.infer<typeof insertGuideEventSchema>;

// =====================================================
// Guide Settings - настройки справочника
// =====================================================
export const guideSettings = pgTable("guide_settings", {
  id: serial("id").primaryKey(),
  featuredSlugs: jsonb("featured_slugs").default([]).$type<string[]>(),
  topicsOrder: jsonb("topics_order").default([]).$type<string[]>(),
  enableIndexing: boolean("enable_indexing").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GuideSettings = typeof guideSettings.$inferSelect;

// =====================================================
// Email Subscriptions - подписки на рассылку
// =====================================================
export const emailSubscriptionStatusEnum = pgEnum("email_subscription_status", [
  "pending", "confirmed", "unsubscribed"
]);

export const emailSubscriptions = pgTable("email_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  confirmationToken: varchar("confirmation_token", { length: 100 }).unique(),
  status: emailSubscriptionStatusEnum("status").default("pending").notNull(),
  source: varchar("source", { length: 50 }).default("website"),
  ipAddress: varchar("ip_address", { length: 45 }),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("email_subscriptions_email_idx").on(table.email),
  index("email_subscriptions_status_idx").on(table.status),
  index("email_subscriptions_token_idx").on(table.confirmationToken),
]);

export const insertEmailSubscriptionSchema = createInsertSchema(emailSubscriptions).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
  unsubscribedAt: true,
});

export type EmailSubscription = typeof emailSubscriptions.$inferSelect;
export type InsertEmailSubscription = z.infer<typeof insertEmailSubscriptionSchema>;

// =====================================================
// Email Service Settings - настройки сервисов рассылки
// =====================================================
export const emailServiceProviderEnum = pgEnum("email_service_provider", [
  "sendpulse", "unisender", "dashamail", "none"
]);

export const emailServiceSettings = pgTable("email_service_settings", {
  id: serial("id").primaryKey(),
  provider: emailServiceProviderEnum("provider").default("none").notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  senderEmail: varchar("sender_email", { length: 255 }),
  senderName: varchar("sender_name", { length: 255 }),
  listId: varchar("list_id", { length: 100 }),
  confirmationSubject: varchar("confirmation_subject", { length: 500 }).default("Подтвердите подписку на рассылку"),
  confirmationTemplate: text("confirmation_template"),
  welcomeSubject: varchar("welcome_subject", { length: 500 }).default("Добро пожаловать!"),
  welcomeTemplate: text("welcome_template"),
  isActive: boolean("is_active").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailServiceSettingsSchema = createInsertSchema(emailServiceSettings).omit({
  id: true,
  updatedAt: true,
});

export type EmailServiceSettings = typeof emailServiceSettings.$inferSelect;
export type InsertEmailServiceSettings = z.infer<typeof insertEmailServiceSettingsSchema>;

// =====================================================
// Changelog - Журнал изменений сайта
// =====================================================
export const changelogEntries = pgTable("changelog_entries", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  affectedUrl: varchar("affected_url", { length: 500 }),
  actions: text("actions").array(),
  authorId: integer("author_id").references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("changelog_entries_published_at_idx").on(table.publishedAt),
]);

export const insertChangelogEntrySchema = createInsertSchema(changelogEntries).omit({
  id: true,
  createdAt: true,
});

export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type InsertChangelogEntry = z.infer<typeof insertChangelogEntrySchema>;

// =====================================================
// Technical Specification - ТЗ для ИИ-агента
// =====================================================
export const technicalSpecs = pgTable("technical_specs", {
  id: serial("id").primaryKey(),
  sectionKey: varchar("section_key", { length: 100 }).notNull().unique(),
  sectionTitle: varchar("section_title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedById: integer("updated_by_id").references(() => users.id),
});

export const insertTechnicalSpecSchema = createInsertSchema(technicalSpecs).omit({
  id: true,
  updatedAt: true,
});

export type TechnicalSpec = typeof technicalSpecs.$inferSelect;
export type InsertTechnicalSpec = z.infer<typeof insertTechnicalSpecSchema>;

// =====================================================
// Contact Form Messages - Обратная форма связи
// =====================================================
export const contactFormStatusEnum = pgEnum("contact_form_status", ["new", "in_progress", "resolved", "spam"]);

export const contactFormMessages = pgTable("contact_form_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  inn: varchar("inn", { length: 15 }),
  email: varchar("email", { length: 255 }),
  telegram: varchar("telegram", { length: 255 }),
  whatsapp: varchar("whatsapp", { length: 255 }),
  message: text("message").notNull(),
  status: contactFormStatusEnum("status").default("new").notNull(),
  adminNotes: text("admin_notes"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedById: integer("resolved_by_id").references(() => users.id),
}, (table) => [
  index("contact_form_messages_status_idx").on(table.status),
  index("contact_form_messages_created_at_idx").on(table.createdAt),
]);

export const insertContactFormMessageSchema = createInsertSchema(contactFormMessages).omit({
  id: true,
  createdAt: true,
  status: true,
  adminNotes: true,
  resolvedAt: true,
  resolvedById: true,
  ipAddress: true,
  userAgent: true,
});

export type ContactFormMessage = typeof contactFormMessages.$inferSelect;
export type InsertContactFormMessage = z.infer<typeof insertContactFormMessageSchema>;

// =====================================================
// Analytics - Аналитика посещений сайта
// =====================================================
export const siteVisits = pgTable("site_visits", {
  id: serial("id").primaryKey(),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  utmSource: varchar("utm_source", { length: 255 }),
  utmMedium: varchar("utm_medium", { length: 255 }),
  utmCampaign: varchar("utm_campaign", { length: 255 }),
  deviceType: varchar("device_type", { length: 20 }),
  browser: varchar("browser", { length: 50 }),
  os: varchar("os", { length: 50 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  totalDurationSeconds: integer("total_duration_seconds").default(0),
  pageCount: integer("page_count").default(0),
}, (table) => [
  index("site_visits_visitor_id_idx").on(table.visitorId),
  index("site_visits_session_id_idx").on(table.sessionId),
  index("site_visits_started_at_idx").on(table.startedAt),
  index("site_visits_user_id_idx").on(table.userId),
]);

export const insertSiteVisitSchema = createInsertSchema(siteVisits).omit({
  id: true,
  startedAt: true,
});

export type SiteVisit = typeof siteVisits.$inferSelect;
export type InsertSiteVisit = z.infer<typeof insertSiteVisitSchema>;

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => siteVisits.id),
  visitorId: varchar("visitor_id", { length: 64 }).notNull(),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  pagePath: varchar("page_path", { length: 500 }).notNull(),
  pageTitle: varchar("page_title", { length: 500 }),
  referrerPath: varchar("referrer_path", { length: 500 }),
  enteredAt: timestamp("entered_at").defaultNow().notNull(),
  exitedAt: timestamp("exited_at"),
  durationSeconds: integer("duration_seconds").default(0),
  scrollDepthPercent: integer("scroll_depth_percent").default(0),
}, (table) => [
  index("page_views_visit_id_idx").on(table.visitId),
  index("page_views_visitor_id_idx").on(table.visitorId),
  index("page_views_page_path_idx").on(table.pagePath),
  index("page_views_entered_at_idx").on(table.enteredAt),
]);

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  enteredAt: true,
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

// Экспресс-проверки (для аналитики бесплатных проверок)
export const expressChecks = pgTable("express_checks", {
  id: serial("id").primaryKey(),
  visitorId: varchar("visitor_id", { length: 64 }),
  userId: integer("user_id").references(() => users.id),
  websiteUrl: varchar("website_url", { length: 500 }).notNull(),
  websiteUrlNormalized: varchar("website_url_normalized", { length: 500 }),
  companyName: varchar("company_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  inn: varchar("inn", { length: 15 }),
  scorePercent: integer("score_percent"),
  severity: varchar("severity", { length: 20 }),
  resultJson: jsonb("result_json"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  conversionType: varchar("conversion_type", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("express_checks_visitor_id_idx").on(table.visitorId),
  index("express_checks_created_at_idx").on(table.createdAt),
  index("express_checks_website_url_idx").on(table.websiteUrlNormalized),
]);

export const insertExpressCheckSchema = createInsertSchema(expressChecks).omit({
  id: true,
  createdAt: true,
});

export type ExpressCheck = typeof expressChecks.$inferSelect;
export type InsertExpressCheck = z.infer<typeof insertExpressCheckSchema>;

// Критерии экспресс-проверки (настраиваемые из админки)
export const expressCriteria = pgTable("express_criteria", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  successMessage: varchar("success_message", { length: 255 }),
  failMessage: varchar("fail_message", { length: 255 }),
  warningMessage: varchar("warning_message", { length: 255 }),
  maxPenaltyAmount: integer("max_penalty_amount").default(0),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertExpressCriteriaSchema = createInsertSchema(expressCriteria).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ExpressCriteria = typeof expressCriteria.$inferSelect;
export type InsertExpressCriteria = z.infer<typeof insertExpressCriteriaSchema>;

// =====================================================
// Document Management System (Manager & Lawyer Workflow)
// =====================================================

export const documentStatusEnum = pgEnum("document_status", [
  "draft",           // Черновик - создан менеджером
  "in_review",       // На проверке у юриста
  "revision",        // Требует доработки
  "approved",        // Одобрен юристом
  "delivered",       // Доставлен клиенту
]);

export const documentTypeEnum = pgEnum("document_type", [
  "privacy_policy",        // Политика обработки ПДн
  "consent_form",          // Согласие на обработку ПДн
  "cookie_policy",         // Политика использования cookies
  "cookie_banner",         // Текст cookie-баннера
  "user_agreement",        // Пользовательское соглашение
  "offer",                 // Оферта
  "terms_of_service",      // Условия использования
  "confidentiality",       // Политика конфиденциальности
  "other",                 // Прочее
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  documentType: documentTypeEnum("document_type").default("other").notNull(),
  status: documentStatusEnum("status").default("draft").notNull(),
  
  // Связи
  orderId: integer("order_id"),
  auditId: integer("audit_id").references(() => audits.id),
  clientUserId: integer("client_user_id").references(() => users.id),
  
  // Ответственные
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  assignedManagerId: integer("assigned_manager_id").references(() => users.id),
  assignedLawyerId: integer("assigned_lawyer_id").references(() => users.id),
  
  // Метаданные текущей версии
  currentVersionId: integer("current_version_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => [
  index("documents_status_idx").on(table.status),
  index("documents_created_by_idx").on(table.createdByUserId),
  index("documents_manager_idx").on(table.assignedManagerId),
  index("documents_lawyer_idx").on(table.assignedLawyerId),
  index("documents_client_idx").on(table.clientUserId),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// Версии документов (история изменений)
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  
  // Файл
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(), // docx, pdf
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSize: integer("file_size").notNull(),
  
  // Кто создал версию
  uploadedByUserId: integer("uploaded_by_user_id").references(() => users.id).notNull(),
  
  // Комментарий к версии
  comment: text("comment"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("document_versions_doc_idx").on(table.documentId),
  index("document_versions_created_idx").on(table.createdAt),
]);

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

// Проверки/ревью документов юристом
export const documentReviews = pgTable("document_reviews", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  versionId: integer("version_id").references(() => documentVersions.id).notNull(),
  reviewerUserId: integer("reviewer_user_id").references(() => users.id).notNull(),
  
  // Решение
  decision: varchar("decision", { length: 20 }).notNull(), // approved, revision_needed, rejected
  comment: text("comment"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("document_reviews_doc_idx").on(table.documentId),
  index("document_reviews_reviewer_idx").on(table.reviewerUserId),
]);

export const insertDocumentReviewSchema = createInsertSchema(documentReviews).omit({
  id: true,
  createdAt: true,
});

export type DocumentReview = typeof documentReviews.$inferSelect;
export type InsertDocumentReview = z.infer<typeof insertDocumentReviewSchema>;
