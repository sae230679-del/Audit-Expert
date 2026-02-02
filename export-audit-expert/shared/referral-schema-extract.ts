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
