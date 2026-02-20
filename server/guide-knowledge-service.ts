import { db } from "./db";
import * as schema from "@shared/schema";
import { eq, and, like, or, ilike, desc, sql, inArray } from "drizzle-orm";

export interface GuideKnowledge {
  articles: Array<{
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    lawTags: string[];
    topicTags: string[];
    bodyMd: string;
    sectionTitle: string;
    topicTitle: string;
    url: string;
  }>;
  totalTokensEstimate: number;
}

export interface SearchResult {
  articleId: number;
  slug: string;
  title: string;
  summary: string | null;
  relevanceScore: number;
  lawTags: string[];
  topicSlug: string;
  sectionSlug: string;
}

const KEYWORDS_MAP: Record<string, string[]> = {
  "политика конфиденциальности": ["politika-konfidencialnosti", "trebovaniya-k-politike-konfidencialnosti", "struktura-politiki-konfidencialnosti", "razmeschenie-politiki-na-sayte", "aktualizaciya-politiki", "oshibki-v-politike-konfidencialnosti", "shablon-politiki-internet-magazin", "chek-list-politika-audit"],
  "согласие": ["soglasie-na-obrabotku", "kak-poluchit-soglasie-pd", "formy-soglasiya-na-obrabotku-pd", "soglasie-na-rassylku", "otzyv-soglasiya-pd", "shablon-soglasiya-na-obrabotku", "chek-list-soglasie-formy"],
  "cookies": ["cookies-i-soglasie", "cookies-i-trebovaniya-fz152", "cookie-banner-trebovaniya", "cookie-kategorii-i-klassifikaciya", "cookies-i-tretyie-storony", "otziv-soglasiya-cookies", "shablon-cookie-politiki", "shablon-cookie-bannera", "chek-list-cookies-soglasie"],
  "cookie": ["cookies-i-soglasie", "cookies-i-trebovaniya-fz152", "cookie-banner-trebovaniya", "cookie-kategorii-i-klassifikaciya", "cookies-i-tretyie-storony", "otziv-soglasiya-cookies", "shablon-cookie-politiki", "shablon-cookie-bannera", "chek-list-cookies-soglasie"],
  "баннер": ["cookie-banner-trebovaniya", "shablon-cookie-bannera"],
  "штраф": ["shtrafy-koap", "vse-shtrafy-za-narushenie-152fz"],
  "персональные данные": ["ponyatie-pd", "chto-takoe-personalnye-dannye"],
  "оператор": ["operator-pd", "kto-takoy-operator-pd"],
  "удаление": ["pravo-na-udalenie", "pravo-na-udalenie-pd"],
  "локализация": ["lokalizaciya-pd-rossiya"],
  "хостинг": ["lokalizaciya-pd-rossiya"],
  "интернет-магазин": ["ecommerce-pd", "ecommerce-trebovaniya-152fz", "shablon-politiki-internet-magazin"],
  "ecommerce": ["ecommerce-pd", "ecommerce-trebovaniya-152fz", "shablon-politiki-internet-magazin"],
  "чек-лист": ["chek-listy", "chek-list-proverki-sayta", "chek-list-cookies-soglasie", "chek-list-soglasie-formy", "chek-list-politika-audit"],
  "шаблон": ["shablon-politiki-internet-magazin", "shablon-soglasiya-na-obrabotku", "shablon-cookie-politiki", "shablon-cookie-bannera"],
  "рассылка": ["soglasie-na-rassylku"],
  "отзыв": ["otzyv-soglasiya-pd", "otziv-soglasiya-cookies"],
  "аналитика": ["cookies-i-tretyie-storony", "cookie-kategorii-i-klassifikaciya"],
  "метрика": ["cookies-i-tretyie-storony", "cookie-kategorii-i-klassifikaciya"],
};

export class GuideKnowledgeService {
  
  async searchRelevantArticles(
    query: string,
    maxResults: number = 5
  ): Promise<SearchResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const relevantSlugs: Set<string> = new Set();
    
    for (const [keyword, slugs] of Object.entries(KEYWORDS_MAP)) {
      if (normalizedQuery.includes(keyword)) {
        slugs.forEach(s => relevantSlugs.add(s));
      }
    }

    const articles = await db
      .select({
        id: schema.guideArticles.id,
        slug: schema.guideArticles.slug,
        title: schema.guideArticles.title,
        summary: schema.guideArticles.summary,
        lawTags: schema.guideArticles.lawTags,
        topicId: schema.guideArticles.topicId,
      })
      .from(schema.guideArticles)
      .where(
        and(
          eq(schema.guideArticles.status, "published"),
          or(
            ilike(schema.guideArticles.title, `%${normalizedQuery}%`),
            ilike(schema.guideArticles.summary, `%${normalizedQuery}%`),
            sql`${schema.guideArticles.topicTags}::text ILIKE ${`%${normalizedQuery}%`}`,
            sql`${schema.guideArticles.lawTags}::text ILIKE ${`%${normalizedQuery}%`}`
          )
        )
      )
      .limit(maxResults * 2);

    const results: SearchResult[] = [];

    for (const article of articles) {
      if (!article.topicId) continue;
      
      const topic = await db
        .select()
        .from(schema.guideTopics)
        .where(eq(schema.guideTopics.id, article.topicId))
        .limit(1);
      
      if (topic.length === 0) continue;
      
      const section = await db
        .select()
        .from(schema.guideSections)
        .where(eq(schema.guideSections.id, topic[0].sectionId))
        .limit(1);
      
      if (section.length === 0) continue;

      let score = 1;
      if (relevantSlugs.has(article.slug)) score += 5;
      if (article.title.toLowerCase().includes(normalizedQuery)) score += 3;
      if (article.summary?.toLowerCase().includes(normalizedQuery)) score += 2;

      results.push({
        articleId: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        relevanceScore: score,
        lawTags: (article.lawTags as string[]) || [],
        topicSlug: topic[0].slug,
        sectionSlug: section[0].slug,
      });
    }

    if (relevantSlugs.size > 0 && results.length < maxResults) {
      const slugsArray = Array.from(relevantSlugs);
      const additionalArticles = await db
        .select({
          id: schema.guideArticles.id,
          slug: schema.guideArticles.slug,
          title: schema.guideArticles.title,
          summary: schema.guideArticles.summary,
          lawTags: schema.guideArticles.lawTags,
          topicId: schema.guideArticles.topicId,
        })
        .from(schema.guideArticles)
        .where(
          and(
            eq(schema.guideArticles.status, "published"),
            inArray(schema.guideArticles.slug, slugsArray)
          )
        );

      for (const article of additionalArticles) {
        if (results.some(r => r.articleId === article.id)) continue;
        if (!article.topicId) continue;

        const topic = await db
          .select()
          .from(schema.guideTopics)
          .where(eq(schema.guideTopics.id, article.topicId))
          .limit(1);
        
        if (topic.length === 0) continue;
        
        const section = await db
          .select()
          .from(schema.guideSections)
          .where(eq(schema.guideSections.id, topic[0].sectionId))
          .limit(1);
        
        if (section.length === 0) continue;

        results.push({
          articleId: article.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          relevanceScore: 5,
          lawTags: (article.lawTags as string[]) || [],
          topicSlug: topic[0].slug,
          sectionSlug: section[0].slug,
        });
      }
    }

    return results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);
  }

  static TOKEN_LIMITS: Record<string, number> = {
    openai: 8000,
    gigachat: 4000,
    yandex: 4000,
    default: 4000,
  };

  static FOUNDATIONAL_ARTICLES = [
    "chto-takoe-personalnye-dannye",
    "trebovaniya-k-politike-konfidencialnosti",
    "vse-shtrafy-za-narushenie-152fz",
    "kak-poluchit-soglasie-pd",
    "cookies-i-trebovaniya-fz152",
  ];

  async getKnowledgeForAudit(
    checkTypes: string[],
    maxTokens: number = 4000,
    provider: string = "default"
  ): Promise<GuideKnowledge> {
    const effectiveMaxTokens = Math.min(
      maxTokens,
      GuideKnowledgeService.TOKEN_LIMITS[provider] || GuideKnowledgeService.TOKEN_LIMITS.default
    );
    
    const relevantKeywords: string[] = [];
    
    for (const checkType of checkTypes) {
      const type = checkType.toLowerCase();
      if (type.includes("policy") || type.includes("политик") || type.includes("privacy") || type.includes("конфиденц")) {
        relevantKeywords.push("политика конфиденциальности");
      }
      if (type.includes("consent") || type.includes("соглас") || type.includes("checkbox") || type.includes("чек")) {
        relevantKeywords.push("согласие");
      }
      if (type.includes("cookie") || type.includes("tracker") || type.includes("аналитик") || type.includes("метрик")) {
        relevantKeywords.push("cookies");
      }
      if (type.includes("penalty") || type.includes("штраф") || type.includes("fine") || type.includes("наруш")) {
        relevantKeywords.push("штраф");
      }
      if (type.includes("personal") || type.includes("персональ") || type.includes("пд") || type.includes("data")) {
        relevantKeywords.push("персональные данные");
      }
      if (type.includes("localization") || type.includes("локализ") || type.includes("hosting") || type.includes("хостинг") || type.includes("россий")) {
        relevantKeywords.push("локализация");
      }
      if (type.includes("ecommerce") || type.includes("магазин") || type.includes("shop") || type.includes("order") || type.includes("заказ")) {
        relevantKeywords.push("интернет-магазин");
      }
      if (type.includes("delete") || type.includes("удален") || type.includes("забвен") || type.includes("право")) {
        relevantKeywords.push("удаление");
      }
      if (type.includes("fz152") || type.includes("152-фз") || type.includes("фз-152") || type.includes("operator") || type.includes("оператор")) {
        relevantKeywords.push("оператор");
        relevantKeywords.push("персональные данные");
      }
    }

    const uniqueKeywords = Array.from(new Set(relevantKeywords));
    const allResults: SearchResult[] = [];

    for (const keyword of uniqueKeywords) {
      const results = await this.searchRelevantArticles(keyword, 3);
      allResults.push(...results);
    }

    const uniqueArticles = new Map<number, SearchResult>();
    for (const result of allResults) {
      const existing = uniqueArticles.get(result.articleId);
      if (!existing || existing.relevanceScore < result.relevanceScore) {
        uniqueArticles.set(result.articleId, result);
      }
    }

    let sortedResults = Array.from(uniqueArticles.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    // FALLBACK: если нет совпадений - загружаем базовые статьи по ФЗ-152
    if (sortedResults.length === 0) {
      console.log("[GuideKnowledge] Нет совпадений по ключевым словам, загружаем базовые статьи");
      const foundationalArticles = await db
        .select({
          id: schema.guideArticles.id,
          slug: schema.guideArticles.slug,
          title: schema.guideArticles.title,
          summary: schema.guideArticles.summary,
          lawTags: schema.guideArticles.lawTags,
          topicId: schema.guideArticles.topicId,
        })
        .from(schema.guideArticles)
        .where(
          and(
            eq(schema.guideArticles.status, "published"),
            sql`${schema.guideArticles.slug} = ANY(${GuideKnowledgeService.FOUNDATIONAL_ARTICLES})`
          )
        );

      for (const article of foundationalArticles) {
        if (!article.topicId) continue;
        
        const [topic] = await db
          .select()
          .from(schema.guideTopics)
          .where(eq(schema.guideTopics.id, article.topicId))
          .limit(1);
        
        if (!topic) continue;
        
        const [section] = await db
          .select()
          .from(schema.guideSections)
          .where(eq(schema.guideSections.id, topic.sectionId))
          .limit(1);
        
        if (!section) continue;

        sortedResults.push({
          articleId: article.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          relevanceScore: 3, // базовый приоритет
          lawTags: (article.lawTags as string[]) || [],
          topicSlug: topic.slug,
          sectionSlug: section.slug,
        });
      }
    }

    const articles: GuideKnowledge["articles"] = [];
    let totalTokens = 0;

    for (const result of sortedResults) {
      const [article] = await db
        .select()
        .from(schema.guideArticles)
        .where(eq(schema.guideArticles.id, result.articleId))
        .limit(1);

      if (!article || !article.topicId) continue;

      const [topic] = await db
        .select()
        .from(schema.guideTopics)
        .where(eq(schema.guideTopics.id, article.topicId))
        .limit(1);

      if (!topic) continue;

      const [section] = await db
        .select()
        .from(schema.guideSections)
        .where(eq(schema.guideSections.id, topic.sectionId))
        .limit(1);

      if (!section) continue;

      const bodyMd = article.bodyBaseMd || "";
      const articleTokens = Math.ceil(bodyMd.length / 4);

      // Используем effectiveMaxTokens вместо maxTokens
      if (totalTokens + articleTokens > effectiveMaxTokens) {
        // Если не влезает полная статья, пробуем добавить только summary
        if (article.summary && totalTokens + 50 <= effectiveMaxTokens) {
          totalTokens += 50;
          articles.push({
            id: article.id,
            slug: article.slug,
            title: article.title,
            summary: article.summary,
            lawTags: (article.lawTags as string[]) || [],
            topicTags: (article.topicTags as string[]) || [],
            bodyMd: `[Краткое содержание] ${article.summary}`,
            sectionTitle: section.title,
            topicTitle: topic.title,
            url: `/guide/${section.slug}/${topic.slug}/${article.slug}`,
          });
        }
        continue;
      }

      totalTokens += articleTokens;

      articles.push({
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        lawTags: (article.lawTags as string[]) || [],
        topicTags: (article.topicTags as string[]) || [],
        bodyMd,
        sectionTitle: section.title,
        topicTitle: topic.title,
        url: `/guide/${section.slug}/${topic.slug}/${article.slug}`,
      });
    }

    return {
      articles,
      totalTokensEstimate: totalTokens,
    };
  }

  formatKnowledgeForPrompt(knowledge: GuideKnowledge): string {
    if (knowledge.articles.length === 0) {
      return "";
    }

    const lines: string[] = [
      "=== СПРАВОЧНИК ПО ФЗ-152 ===",
      "Ниже приведены релевантные статьи из базы знаний Help152FZ:",
      "",
    ];

    for (const article of knowledge.articles) {
      lines.push(`--- ${article.title} ---`);
      lines.push(`Раздел: ${article.sectionTitle} > ${article.topicTitle}`);
      if (article.lawTags.length > 0) {
        lines.push(`Нормативные акты: ${article.lawTags.join(", ")}`);
      }
      lines.push("");
      lines.push(article.bodyMd);
      lines.push("");
      lines.push(`Источник: ${article.url}`);
      lines.push("");
    }

    lines.push("=== КОНЕЦ СПРАВОЧНИКА ===");
    lines.push("");

    return lines.join("\n");
  }

  async getArticleBySlug(slug: string): Promise<schema.GuideArticle | null> {
    const [article] = await db
      .select()
      .from(schema.guideArticles)
      .where(
        and(
          eq(schema.guideArticles.slug, slug),
          eq(schema.guideArticles.status, "published")
        )
      )
      .limit(1);

    return article || null;
  }

  async getAllPublishedArticles(): Promise<GuideKnowledge> {
    const articles = await db
      .select()
      .from(schema.guideArticles)
      .where(eq(schema.guideArticles.status, "published"))
      .orderBy(desc(schema.guideArticles.publishedAt));

    const result: GuideKnowledge["articles"] = [];
    let totalTokens = 0;

    for (const article of articles) {
      if (!article.topicId) continue;

      const [topic] = await db
        .select()
        .from(schema.guideTopics)
        .where(eq(schema.guideTopics.id, article.topicId))
        .limit(1);

      if (!topic) continue;

      const [section] = await db
        .select()
        .from(schema.guideSections)
        .where(eq(schema.guideSections.id, topic.sectionId))
        .limit(1);

      if (!section) continue;

      const bodyMd = article.bodyBaseMd || "";
      totalTokens += Math.ceil(bodyMd.length / 4);

      result.push({
        id: article.id,
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        lawTags: (article.lawTags as string[]) || [],
        topicTags: (article.topicTags as string[]) || [],
        bodyMd,
        sectionTitle: section.title,
        topicTitle: topic.title,
        url: `/guide/${section.slug}/${topic.slug}/${article.slug}`,
      });
    }

    return {
      articles: result,
      totalTokensEstimate: totalTokens,
    };
  }
  // Маппинг категорий на статьи с правильными путями из БД
  static CATEGORY_TO_ARTICLE_MAP: Record<string, { url: string; title: string }> = {
    "policy": { url: "/guide/org-tech-mery/politika-konfidencialnosti/trebovaniya-k-politike-konfidencialnosti", title: "Требования к политике конфиденциальности" },
    "privacy": { url: "/guide/org-tech-mery/politika-konfidencialnosti/trebovaniya-k-politike-konfidencialnosti", title: "Требования к политике конфиденциальности" },
    "политика": { url: "/guide/org-tech-mery/politika-konfidencialnosti/trebovaniya-k-politike-konfidencialnosti", title: "Требования к политике конфиденциальности" },
    "конфиденциальност": { url: "/guide/org-tech-mery/politika-konfidencialnosti/trebovaniya-k-politike-konfidencialnosti", title: "Требования к политике конфиденциальности" },
    "consent": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/kak-poluchit-soglasie-pd", title: "Как получить согласие на обработку ПД" },
    "согласие": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/kak-poluchit-soglasie-pd", title: "Как получить согласие на обработку ПД" },
    "чекбокс": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/kak-poluchit-soglasie-pd", title: "Как получить согласие на обработку ПД" },
    "cookie": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/cookies-i-soglasie", title: "Cookies и согласие: требования ФЗ-152" },
    "cookies": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/cookies-i-soglasie", title: "Cookies и согласие: требования ФЗ-152" },
    "баннер": { url: "/guide/pravovye-osnovaniya/soglasie-na-obrabotku/cookies-i-soglasie", title: "Cookies и согласие: требования ФЗ-152" },
    "penalty": { url: "/guide/otvetstvennost/shtrafy-koap/vse-shtrafy-za-narushenie-152fz", title: "Штрафы за нарушение ФЗ-152" },
    "штраф": { url: "/guide/otvetstvennost/shtrafy-koap/vse-shtrafy-za-narushenie-152fz", title: "Штрафы за нарушение ФЗ-152" },
    "нарушен": { url: "/guide/otvetstvennost/shtrafy-koap/vse-shtrafy-za-narushenie-152fz", title: "Штрафы за нарушение ФЗ-152" },
    "personal": { url: "/guide/osnovnye-polozheniya/ponyatie-pd/chto-takoe-personalnye-dannye", title: "Что такое персональные данные по ФЗ-152" },
    "персональн": { url: "/guide/osnovnye-polozheniya/ponyatie-pd/chto-takoe-personalnye-dannye", title: "Что такое персональные данные по ФЗ-152" },
    "ecommerce": { url: "/guide/specialnye-temy/ecommerce-pd/ecommerce-trebovaniya-152fz", title: "Требования ФЗ-152 для интернет-магазинов" },
    "магазин": { url: "/guide/specialnye-temy/ecommerce-pd/ecommerce-trebovaniya-152fz", title: "Требования ФЗ-152 для интернет-магазинов" },
    "заказ": { url: "/guide/specialnye-temy/ecommerce-pd/ecommerce-trebovaniya-152fz", title: "Требования ФЗ-152 для интернет-магазинов" },
    "localization": { url: "/guide/prava-subektov/pravo-na-udalenie/lokalizaciya-pd-rossiya", title: "Локализация персональных данных в России" },
    "хостинг": { url: "/guide/prava-subektov/pravo-na-udalenie/lokalizaciya-pd-rossiya", title: "Локализация персональных данных в России" },
    "россий": { url: "/guide/prava-subektov/pravo-na-udalenie/lokalizaciya-pd-rossiya", title: "Локализация персональных данных в России" },
    "удален": { url: "/guide/prava-subektov/pravo-na-udalenie/pravo-na-udalenie-pd", title: "Право на удаление персональных данных" },
    "забвен": { url: "/guide/prava-subektov/pravo-na-udalenie/pravo-na-udalenie-pd", title: "Право на удаление персональных данных" },
    "оператор": { url: "/guide/subekty-i-objekty/operator-pd/kto-takoy-operator-pd", title: "Кто такой оператор персональных данных" },
    "чек-лист": { url: "/guide/prakticheskie-instrumenty/chek-listy/chek-list-proverki-sayta", title: "Чек-лист проверки сайта на соответствие ФЗ-152" },
  };

  getGuideArticleForCategory(category: string, checkName: string): { url: string; title: string } | null {
    const categoryLower = category.toLowerCase();
    const nameLower = checkName.toLowerCase();
    
    for (const [key, article] of Object.entries(GuideKnowledgeService.CATEGORY_TO_ARTICLE_MAP)) {
      if (categoryLower.includes(key) || nameLower.includes(key)) {
        return {
          url: article.url,
          title: article.title,
        };
      }
    }

    // Fallback маппинг по типичным категориям проверок
    if (categoryLower.includes("ssl") || categoryLower.includes("https") || categoryLower.includes("security") || categoryLower.includes("technical")) {
      return null; // Технические проверки не связаны напрямую со справочником по ФЗ-152
    }
    
    // Для категорий связанных с ФЗ-152 но не распознанных - возвращаем общую статью
    if (categoryLower.includes("fz152") || categoryLower.includes("152") || categoryLower.includes("legal") || categoryLower.includes("правов")) {
      return {
        url: "/guide/osnovnye-polozheniya/ponyatie-pd/chto-takoe-personalnye-dannye",
        title: "Что такое персональные данные по ФЗ-152",
      };
    }
    
    return null;
  }

  async getArticleUrlBySlug(slug: string): Promise<string | null> {
    const [article] = await db
      .select({
        slug: schema.guideArticles.slug,
        topicId: schema.guideArticles.topicId,
      })
      .from(schema.guideArticles)
      .where(eq(schema.guideArticles.slug, slug))
      .limit(1);

    if (!article || !article.topicId) return null;

    const [topic] = await db
      .select({ slug: schema.guideTopics.slug, sectionId: schema.guideTopics.sectionId })
      .from(schema.guideTopics)
      .where(eq(schema.guideTopics.id, article.topicId))
      .limit(1);

    if (!topic) return null;

    const [section] = await db
      .select({ slug: schema.guideSections.slug })
      .from(schema.guideSections)
      .where(eq(schema.guideSections.id, topic.sectionId))
      .limit(1);

    if (!section) return null;

    return `/guide/${section.slug}/${topic.slug}/${article.slug}`;
  }
}

export const guideKnowledgeService = new GuideKnowledgeService();
