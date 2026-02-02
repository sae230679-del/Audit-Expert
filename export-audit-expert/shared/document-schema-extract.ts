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
