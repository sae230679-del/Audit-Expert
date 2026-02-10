import { 
  type User, type InsertUser, 
  type Package, type InsertPackage,
  type FaqItem, type InsertFaqItem,
  type SiteSettings, type InsertSiteSettings,
  type ContactMessage, type InsertContactMessage,
  type Order, type InsertOrder,
  type MenuItem, type InsertMenuItem,
  type Case, type InsertCase,
  type PromoCode, type InsertPromoCode,
  type ReferralSettings, type InsertReferralSettings,
  type Referral, type InsertReferral,
  type Payout, type InsertPayout,
  type Notification, type InsertNotification,
  type UserSubscription, type InsertUserSubscription,
  type Commission, type InsertCommission,
  type UpdateUserProfile,
  type UserSite, type InsertUserSite,
  type SiteAudit, type InsertSiteAudit,
  type AuditFinding, type InsertAuditFinding,
  type SubscriptionPlan, type InsertSubscriptionPlan,
  type SiteSubscription, type InsertSiteSubscription,
  type Ticket, type InsertTicket,
  type TicketMessage, type InsertTicketMessage,
  type AdminLog, type InsertAdminLog,
  type Document, type InsertDocument,
  type PasswordReset, type InsertPasswordReset,
  type GuideSection, type InsertGuideSection,
  type GuideTopic, type InsertGuideTopic,
  type GuideArticle, type InsertGuideArticle,
  users, packages, faqItems, siteSettings, contactMessages, orders, menuItems, cases, promoCodes, referralSettings, referrals, payouts, notifications, userSubscriptions, commissions,
  userSites, siteAudits, auditFindings, subscriptionPlans, siteSubscriptions, tickets, ticketMessages, adminLogs, documents,
  passwordResets, guideSections, guideTopics, guideArticles
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Packages
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, data: Partial<InsertPackage>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<void>;

  // FAQ
  getAllFaqItems(): Promise<FaqItem[]>;
  getFaqItem(id: string): Promise<FaqItem | undefined>;
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: string, data: Partial<InsertFaqItem>): Promise<FaqItem | undefined>;
  deleteFaqItem(id: string): Promise<void>;

  // Site Settings
  getSettings(): Promise<SiteSettings | undefined>;
  updateSettings(data: Partial<InsertSiteSettings>): Promise<SiteSettings>;

  // GigaChat Settings
  getGigaChatSettings(): Promise<any>;
  saveGigaChatSettings(data: any): Promise<any>;

  // Contact Messages
  getAllMessages(): Promise<ContactMessage[]>;
  getMessage(id: string): Promise<ContactMessage | undefined>;
  createMessage(msg: InsertContactMessage): Promise<ContactMessage>;
  updateMessage(id: string, data: Partial<ContactMessage>): Promise<ContactMessage | undefined>;
  deleteMessage(id: string): Promise<void>;

  // Orders
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<void>;
  deleteOrdersBulk(ids: string[]): Promise<void>;

  // Menu Items
  getAllMenuItems(): Promise<MenuItem[]>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;

  // Cases
  getAllCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(item: InsertCase): Promise<Case>;
  updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined>;
  deleteCase(id: string): Promise<void>;

  // Promo Codes
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(id: string): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(item: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<InsertPromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<void>;
  incrementPromoCodeUsage(id: string): Promise<void>;

  // Referral Settings
  getReferralSettings(): Promise<ReferralSettings | undefined>;
  updateReferralSettings(data: Partial<InsertReferralSettings>): Promise<ReferralSettings>;

  // User by email, referral code, and OAuth IDs
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getUserByVkId(vkId: string): Promise<User | undefined>;
  getUserByYandexId(yandexId: string): Promise<User | undefined>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined>;

  // Referrals
  getReferralsByReferrerId(referrerId: string): Promise<Referral[]>;
  createReferral(data: InsertReferral): Promise<Referral>;
  updateReferral(id: string, data: Partial<Referral>): Promise<Referral | undefined>;

  // Payouts
  getPayoutsByUserId(userId: string): Promise<Payout[]>;
  getAllPayouts(): Promise<Payout[]>;
  createPayout(data: InsertPayout): Promise<Payout>;
  updatePayout(id: string, data: Partial<Payout>): Promise<Payout | undefined>;

  // Notifications
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // User Subscriptions
  getUserSubscription(userId: string): Promise<UserSubscription | undefined>;
  createOrUpdateSubscription(userId: string, data: Partial<InsertUserSubscription>): Promise<UserSubscription>;

  // Password Resets
  createPasswordReset(data: InsertPasswordReset): Promise<PasswordReset>;
  getPasswordResetByToken(tokenHash: string): Promise<PasswordReset | undefined>;
  markPasswordResetUsed(id: string): Promise<void>;

  // Commissions
  getCommissionsByUserId(userId: string): Promise<Commission[]>;
  getCommissionsByOrderId(orderId: string): Promise<Commission[]>;
  createCommission(data: InsertCommission): Promise<Commission>;
  updateCommission(id: string, data: Partial<Commission>): Promise<Commission | undefined>;
  getUserBalance(userId: string): Promise<number>;

  // Stats
  getStats(): Promise<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingMessages: number;
    todayChecks: number;
    paidReports: number;
  }>;

  // User Sites
  getAllSites(): Promise<UserSite[]>;
  getSite(id: string): Promise<UserSite | undefined>;
  getUserSites(userId: string): Promise<UserSite[]>;
  getUserSite(id: string): Promise<UserSite | undefined>;
  getUserSiteByUrl(userId: string, url: string): Promise<UserSite | undefined>;
  createUserSite(data: InsertUserSite): Promise<UserSite>;
  updateUserSite(id: string, data: Partial<UserSite>): Promise<UserSite | undefined>;
  deleteUserSite(id: string): Promise<void>;

  // Site Audits
  getAllAudits(): Promise<SiteAudit[]>;
  getSiteAudits(siteId: string): Promise<SiteAudit[]>;
  getSiteAudit(id: string): Promise<SiteAudit | undefined>;
  getAuditsByUserId(userId: string): Promise<SiteAudit[]>;
  createSiteAudit(data: InsertSiteAudit): Promise<SiteAudit>;
  updateSiteAudit(id: string, data: Partial<SiteAudit>): Promise<SiteAudit | undefined>;

  // Audit Findings
  getAuditFindings(auditId: string): Promise<AuditFinding[]>;
  createAuditFinding(data: InsertAuditFinding): Promise<AuditFinding>;
  updateAuditFinding(id: string, data: Partial<AuditFinding>): Promise<AuditFinding | undefined>;

  // Subscription Plans
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(data: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<void>;

  // Site Subscriptions
  getSiteSubscriptionsByUserId(userId: string): Promise<SiteSubscription[]>;
  getSiteSubscription(id: string): Promise<SiteSubscription | undefined>;
  createSiteSubscription(data: InsertSiteSubscription): Promise<SiteSubscription>;
  updateSiteSubscription(id: string, data: Partial<SiteSubscription>): Promise<SiteSubscription | undefined>;

  // Tickets
  getAllTickets(): Promise<Ticket[]>;
  getTicketsByUserId(userId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(data: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket | undefined>;

  // Ticket Messages
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  createTicketMessage(data: InsertTicketMessage): Promise<TicketMessage>;

  // Admin Logs
  getAllAdminLogs(): Promise<AdminLog[]>;
  getAdminLogsByActor(actorId: string): Promise<AdminLog[]>;
  createAdminLog(data: InsertAdminLog): Promise<AdminLog>;

  // Documents (Document Management System)
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByUserId(userId: string): Promise<Document[]>;
  getDocumentsByStatus(status: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Packages
  async getAllPackages(): Promise<Package[]> {
    return db.select().from(packages).orderBy(packages.sortOrder);
  }

  async getPackage(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg || undefined;
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [created] = await db.insert(packages).values(pkg).returning();
    return created;
  }

  async updatePackage(id: string, data: Partial<InsertPackage>): Promise<Package | undefined> {
    const [pkg] = await db.update(packages).set(data).where(eq(packages.id, id)).returning();
    return pkg || undefined;
  }

  async deletePackage(id: string): Promise<void> {
    await db.delete(packages).where(eq(packages.id, id));
  }

  // FAQ
  async getAllFaqItems(): Promise<FaqItem[]> {
    return db.select().from(faqItems).orderBy(faqItems.sortOrder);
  }

  async getFaqItem(id: string): Promise<FaqItem | undefined> {
    const [item] = await db.select().from(faqItems).where(eq(faqItems.id, id));
    return item || undefined;
  }

  async createFaqItem(item: InsertFaqItem): Promise<FaqItem> {
    const [created] = await db.insert(faqItems).values(item).returning();
    return created;
  }

  async updateFaqItem(id: string, data: Partial<InsertFaqItem>): Promise<FaqItem | undefined> {
    const [item] = await db.update(faqItems).set(data).where(eq(faqItems.id, id)).returning();
    return item || undefined;
  }

  async deleteFaqItem(id: string): Promise<void> {
    await db.delete(faqItems).where(eq(faqItems.id, id));
  }

  // Site Settings
  async getSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    return settings || undefined;
  }

  async updateSettings(data: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    const existing = await this.getSettings();
    if (existing) {
      const [updated] = await db.update(siteSettings).set(data).where(eq(siteSettings.id, existing.id)).returning();
      return updated;
    } else {
      const [created] = await db.insert(siteSettings).values(data).returning();
      return created;
    }
  }

  async getGigaChatSettings(): Promise<any> {
    const settings = await this.getSettings();
    if (settings && settings.gigachatSettings) {
      return settings.gigachatSettings;
    }
    return null;
  }

  async saveGigaChatSettings(data: any): Promise<any> {
    await this.updateSettings({ gigachatSettings: data });
    return data;
  }

  // Contact Messages
  async getAllMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async getMessage(id: string): Promise<ContactMessage | undefined> {
    const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return msg || undefined;
  }

  async createMessage(msg: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(msg).returning();
    return created;
  }

  async updateMessage(id: string, data: Partial<ContactMessage>): Promise<ContactMessage | undefined> {
    const [msg] = await db.update(contactMessages).set(data).where(eq(contactMessages.id, id)).returning();
    return msg || undefined;
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  // Orders
  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [created] = await db.insert(orders).values(order).returning();
    return created;
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async deleteOrder(id: string): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async deleteOrdersBulk(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(orders).where(inArray(orders.id, ids));
  }

  // Menu Items
  async getAllMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).orderBy(menuItems.sortOrder);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: string, data: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [item] = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return item || undefined;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Cases
  async getAllCases(): Promise<Case[]> {
    return db.select().from(cases).orderBy(cases.sortOrder);
  }

  async getCase(id: string): Promise<Case | undefined> {
    const [item] = await db.select().from(cases).where(eq(cases.id, id));
    return item || undefined;
  }

  async createCase(item: InsertCase): Promise<Case> {
    const [created] = await db.insert(cases).values(item).returning();
    return created;
  }

  async updateCase(id: string, data: Partial<InsertCase>): Promise<Case | undefined> {
    const [item] = await db.update(cases).set(data).where(eq(cases.id, id)).returning();
    return item || undefined;
  }

  async deleteCase(id: string): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  // Promo Codes
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCode(id: string): Promise<PromoCode | undefined> {
    const [item] = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
    return item || undefined;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [item] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return item || undefined;
  }

  async createPromoCode(item: InsertPromoCode): Promise<PromoCode> {
    const [created] = await db.insert(promoCodes).values({
      ...item,
      code: item.code.toUpperCase(),
    }).returning();
    return created;
  }

  async updatePromoCode(id: string, data: Partial<InsertPromoCode>): Promise<PromoCode | undefined> {
    const updateData = data.code ? { ...data, code: data.code.toUpperCase() } : data;
    const [item] = await db.update(promoCodes).set(updateData).where(eq(promoCodes.id, id)).returning();
    return item || undefined;
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async incrementPromoCodeUsage(id: string): Promise<void> {
    await db.update(promoCodes)
      .set({ currentUses: sql`${promoCodes.currentUses} + 1` })
      .where(eq(promoCodes.id, id));
  }

  // Referral Settings
  async getReferralSettings(): Promise<ReferralSettings | undefined> {
    const [settings] = await db.select().from(referralSettings).limit(1);
    return settings || undefined;
  }

  async updateReferralSettings(data: Partial<InsertReferralSettings>): Promise<ReferralSettings> {
    const existing = await this.getReferralSettings();
    if (existing) {
      const [updated] = await db.update(referralSettings).set(data).where(eq(referralSettings.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(referralSettings).values(data as InsertReferralSettings).returning();
    return created;
  }

  // User by email and referral code
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async getUserByVkId(vkId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.vkId, vkId));
    return user || undefined;
  }

  async getUserByYandexId(yandexId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.yandexId, yandexId));
    return user || undefined;
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async updateUserProfile(id: string, data: UpdateUserProfile): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Referrals
  async getReferralsByReferrerId(referrerId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.referrerId, referrerId)).orderBy(desc(referrals.createdAt));
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values(data).returning();
    return created;
  }

  async updateReferral(id: string, data: Partial<Referral>): Promise<Referral | undefined> {
    const [updated] = await db.update(referrals).set(data).where(eq(referrals.id, id)).returning();
    return updated || undefined;
  }

  // Payouts
  async getPayoutsByUserId(userId: string): Promise<Payout[]> {
    return db.select().from(payouts).where(eq(payouts.userId, userId)).orderBy(desc(payouts.createdAt));
  }

  async getAllPayouts(): Promise<Payout[]> {
    return db.select().from(payouts).orderBy(desc(payouts.createdAt));
  }

  async createPayout(data: InsertPayout): Promise<Payout> {
    const [created] = await db.insert(payouts).values(data).returning();
    return created;
  }

  async updatePayout(id: string, data: Partial<Payout>): Promise<Payout | undefined> {
    const [updated] = await db.update(payouts).set(data).where(eq(payouts.id, id)).returning();
    return updated || undefined;
  }

  // Notifications
  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(data).returning();
    return created;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return updated || undefined;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  // User Subscriptions
  async getUserSubscription(userId: string): Promise<UserSubscription | undefined> {
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return sub || undefined;
  }

  async createOrUpdateSubscription(userId: string, data: Partial<InsertUserSubscription>): Promise<UserSubscription> {
    const existing = await this.getUserSubscription(userId);
    if (existing) {
      const [updated] = await db.update(userSubscriptions).set(data).where(eq(userSubscriptions.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(userSubscriptions).values({ userId, ...data }).returning();
    return created;
  }

  // Password Resets
  async createPasswordReset(data: InsertPasswordReset): Promise<PasswordReset> {
    const [created] = await db.insert(passwordResets).values(data).returning();
    return created;
  }

  async getPasswordResetByToken(tokenHash: string): Promise<PasswordReset | undefined> {
    const [reset] = await db.select().from(passwordResets)
      .where(and(eq(passwordResets.tokenHash, tokenHash), gte(passwordResets.expiresAt, new Date())));
    if (reset && reset.usedAt) return undefined;
    return reset || undefined;
  }

  async markPasswordResetUsed(id: string): Promise<void> {
    await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, id));
  }

  // Commissions
  async getCommissionsByUserId(userId: string): Promise<Commission[]> {
    return db.select().from(commissions).where(eq(commissions.userId, userId)).orderBy(desc(commissions.createdAt));
  }

  async getCommissionsByOrderId(orderId: string): Promise<Commission[]> {
    return db.select().from(commissions).where(eq(commissions.orderId, orderId));
  }

  async createCommission(data: InsertCommission): Promise<Commission> {
    const [created] = await db.insert(commissions).values(data).returning();
    return created;
  }

  async updateCommission(id: string, data: Partial<Commission>): Promise<Commission | undefined> {
    const [updated] = await db.update(commissions).set(data).where(eq(commissions.id, id)).returning();
    return updated || undefined;
  }

  async getUserBalance(userId: string): Promise<number> {
    const allCommissions = await db.select().from(commissions).where(
      and(eq(commissions.userId, userId), eq(commissions.status, 'credited'))
    );
    const allPayouts = await db.select().from(payouts).where(
      and(eq(payouts.userId, userId), eq(payouts.status, 'completed'))
    );
    
    const totalCommissions = allCommissions.reduce((sum, c) => sum + c.amount, 0);
    const totalPayouts = allPayouts.reduce((sum, p) => sum + p.amount, 0);
    return totalCommissions - totalPayouts;
  }

  // Stats
  async getStats(): Promise<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    pendingMessages: number;
    todayChecks: number;
    paidReports: number;
  }> {
    const allUsers = await db.select().from(users);
    const allOrders = await db.select().from(orders);
    const allMessages = await db.select().from(contactMessages);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidOrders = allOrders.filter(o => o.status === 'paid' || o.status === 'completed');
    const todayOrders = allOrders.filter(o => {
      if (!o.createdAt) return false;
      return new Date(o.createdAt) >= today;
    });
    const expressOrders = paidOrders.filter(o => o.orderType === 'express');
    const unreadMessages = allMessages.filter(m => !m.isRead && !m.isSpam);

    return {
      totalUsers: allUsers.length,
      totalOrders: allOrders.length,
      totalRevenue: paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
      pendingMessages: unreadMessages.length,
      todayChecks: todayOrders.length,
      paidReports: expressOrders.length,
    };
  }

  // User Sites
  async getAllSites(): Promise<UserSite[]> {
    return db.select().from(userSites).orderBy(desc(userSites.createdAt));
  }

  async getSite(id: string): Promise<UserSite | undefined> {
    const [site] = await db.select().from(userSites).where(eq(userSites.id, id));
    return site || undefined;
  }

  async getUserSites(userId: string): Promise<UserSite[]> {
    return db.select().from(userSites).where(eq(userSites.userId, userId)).orderBy(desc(userSites.createdAt));
  }

  async getUserSite(id: string): Promise<UserSite | undefined> {
    const [site] = await db.select().from(userSites).where(eq(userSites.id, id));
    return site || undefined;
  }

  async getUserSiteByUrl(userId: string, url: string): Promise<UserSite | undefined> {
    const [site] = await db.select().from(userSites).where(and(eq(userSites.userId, userId), eq(userSites.url, url)));
    return site || undefined;
  }

  async createUserSite(data: InsertUserSite): Promise<UserSite> {
    const [created] = await db.insert(userSites).values(data).returning();
    return created;
  }

  async updateUserSite(id: string, data: Partial<UserSite>): Promise<UserSite | undefined> {
    const [updated] = await db.update(userSites).set(data).where(eq(userSites.id, id)).returning();
    return updated || undefined;
  }

  async deleteUserSite(id: string): Promise<void> {
    await db.delete(userSites).where(eq(userSites.id, id));
  }

  // Site Audits
  async getAllAudits(): Promise<SiteAudit[]> {
    return db.select().from(siteAudits).orderBy(desc(siteAudits.createdAt));
  }

  async getSiteAudits(siteId: string): Promise<SiteAudit[]> {
    return db.select().from(siteAudits).where(eq(siteAudits.siteId, siteId)).orderBy(desc(siteAudits.createdAt));
  }

  async getSiteAudit(id: string): Promise<SiteAudit | undefined> {
    const [audit] = await db.select().from(siteAudits).where(eq(siteAudits.id, id));
    return audit || undefined;
  }

  async getAuditsByUserId(userId: string): Promise<SiteAudit[]> {
    const sites = await this.getUserSites(userId);
    const siteIds = sites.map(s => s.id);
    if (siteIds.length === 0) return [];
    const audits: SiteAudit[] = [];
    for (const siteId of siteIds) {
      const siteAuditsResult = await db.select().from(siteAudits).where(eq(siteAudits.siteId, siteId));
      audits.push(...siteAuditsResult);
    }
    return audits.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createSiteAudit(data: InsertSiteAudit): Promise<SiteAudit> {
    const [created] = await db.insert(siteAudits).values(data).returning();
    return created;
  }

  async updateSiteAudit(id: string, data: Partial<SiteAudit>): Promise<SiteAudit | undefined> {
    const [updated] = await db.update(siteAudits).set(data).where(eq(siteAudits.id, id)).returning();
    return updated || undefined;
  }

  // Audit Findings
  async getAuditFindings(auditId: string): Promise<AuditFinding[]> {
    return db.select().from(auditFindings).where(eq(auditFindings.auditId, auditId)).orderBy(auditFindings.sortOrder);
  }

  async createAuditFinding(data: InsertAuditFinding): Promise<AuditFinding> {
    const [created] = await db.insert(auditFindings).values(data).returning();
    return created;
  }

  async updateAuditFinding(id: string, data: Partial<AuditFinding>): Promise<AuditFinding | undefined> {
    const [updated] = await db.update(auditFindings).set(data).where(eq(auditFindings.id, id)).returning();
    return updated || undefined;
  }

  // Subscription Plans
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan || undefined;
  }

  async createSubscriptionPlan(data: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(data).returning();
    return created;
  }

  async updateSubscriptionPlan(id: string, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const [updated] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    return updated || undefined;
  }

  async deleteSubscriptionPlan(id: string): Promise<void> {
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  }

  // Site Subscriptions
  async getSiteSubscriptionsByUserId(userId: string): Promise<SiteSubscription[]> {
    return db.select().from(siteSubscriptions).where(eq(siteSubscriptions.userId, userId)).orderBy(desc(siteSubscriptions.createdAt));
  }

  async getSiteSubscription(id: string): Promise<SiteSubscription | undefined> {
    const [sub] = await db.select().from(siteSubscriptions).where(eq(siteSubscriptions.id, id));
    return sub || undefined;
  }

  async createSiteSubscription(data: InsertSiteSubscription): Promise<SiteSubscription> {
    const [created] = await db.insert(siteSubscriptions).values(data).returning();
    return created;
  }

  async updateSiteSubscription(id: string, data: Partial<SiteSubscription>): Promise<SiteSubscription | undefined> {
    const [updated] = await db.update(siteSubscriptions).set(data).where(eq(siteSubscriptions.id, id)).returning();
    return updated || undefined;
  }

  // Tickets
  async getAllTickets(): Promise<Ticket[]> {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt));
  }

  async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket || undefined;
  }

  async createTicket(data: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(data).returning();
    return created;
  }

  async updateTicket(id: string, data: Partial<Ticket>): Promise<Ticket | undefined> {
    const [updated] = await db.update(tickets).set(data).where(eq(tickets.id, id)).returning();
    return updated || undefined;
  }

  // Ticket Messages
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }

  async createTicketMessage(data: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(data).returning();
    return created;
  }

  // Admin Logs
  async getAllAdminLogs(): Promise<AdminLog[]> {
    return db.select().from(adminLogs).orderBy(desc(adminLogs.createdAt));
  }

  async getAdminLogsByActor(actorId: string): Promise<AdminLog[]> {
    return db.select().from(adminLogs).where(eq(adminLogs.actorId, actorId)).orderBy(desc(adminLogs.createdAt));
  }

  async createAdminLog(data: InsertAdminLog): Promise<AdminLog> {
    const [created] = await db.insert(adminLogs).values(data).returning();
    return created;
  }

  // Documents (Document Management System)
  async getAllDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByUserId(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.clientUserId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByStatus(status: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.status, status as any)).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, Number(id)));
    return doc || undefined;
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(data).returning();
    return created;
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db.update(documents).set({ ...data, updatedAt: new Date() } as any).where(eq(documents.id, Number(id))).returning();
    return updated || undefined;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, Number(id)));
  }

  // Guide Sections
  async getGuideSections(): Promise<GuideSection[]> {
    return db.select().from(guideSections).orderBy(guideSections.sortOrder);
  }

  async getGuideSection(id: number): Promise<GuideSection | undefined> {
    const [section] = await db.select().from(guideSections).where(eq(guideSections.id, id));
    return section || undefined;
  }

  async createGuideSection(data: InsertGuideSection): Promise<GuideSection> {
    const [created] = await db.insert(guideSections).values(data).returning();
    return created;
  }

  async updateGuideSection(id: number, data: Partial<InsertGuideSection>): Promise<GuideSection | undefined> {
    const [updated] = await db.update(guideSections).set({ ...data, updatedAt: new Date() }).where(eq(guideSections.id, id)).returning();
    return updated || undefined;
  }

  async deleteGuideSection(id: number): Promise<void> {
    await db.delete(guideTopics).where(eq(guideTopics.sectionId, id));
    await db.delete(guideSections).where(eq(guideSections.id, id));
  }

  // Guide Topics
  async getGuideTopics(sectionId?: number): Promise<GuideTopic[]> {
    if (sectionId) {
      return db.select().from(guideTopics).where(eq(guideTopics.sectionId, sectionId)).orderBy(guideTopics.sortOrder);
    }
    return db.select().from(guideTopics).orderBy(guideTopics.sortOrder);
  }

  async getGuideTopic(id: number): Promise<GuideTopic | undefined> {
    const [topic] = await db.select().from(guideTopics).where(eq(guideTopics.id, id));
    return topic || undefined;
  }

  async createGuideTopic(data: InsertGuideTopic): Promise<GuideTopic> {
    const [created] = await db.insert(guideTopics).values(data).returning();
    return created;
  }

  async updateGuideTopic(id: number, data: Partial<InsertGuideTopic>): Promise<GuideTopic | undefined> {
    const [updated] = await db.update(guideTopics).set({ ...data, updatedAt: new Date() }).where(eq(guideTopics.id, id)).returning();
    return updated || undefined;
  }

  async deleteGuideTopic(id: number): Promise<void> {
    await db.delete(guideArticles).where(eq(guideArticles.topicId, id));
    await db.delete(guideTopics).where(eq(guideTopics.id, id));
  }

  // Guide Articles
  async getGuideArticles(topicId?: number): Promise<GuideArticle[]> {
    if (topicId) {
      return db.select().from(guideArticles).where(eq(guideArticles.topicId, topicId)).orderBy(desc(guideArticles.createdAt));
    }
    return db.select().from(guideArticles).orderBy(desc(guideArticles.createdAt));
  }

  async getGuideArticle(id: number): Promise<GuideArticle | undefined> {
    const [article] = await db.select().from(guideArticles).where(eq(guideArticles.id, id));
    return article || undefined;
  }

  async createGuideArticle(data: InsertGuideArticle): Promise<GuideArticle> {
    const [created] = await db.insert(guideArticles).values(data as any).returning();
    return created;
  }

  async updateGuideArticle(id: number, data: Partial<InsertGuideArticle>): Promise<GuideArticle | undefined> {
    const [updated] = await db.update(guideArticles).set({ ...data, updatedAt: new Date() } as any).where(eq(guideArticles.id, id)).returning();
    return updated || undefined;
  }

  async deleteGuideArticle(id: number): Promise<void> {
    await db.delete(guideArticles).where(eq(guideArticles.id, id));
  }
}

export const storage = new DatabaseStorage();
