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

