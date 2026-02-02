import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { requireAdmin } from "./middleware/auth";
import { db } from "./db";
import { siteVisits, pageViews, expressChecks, users, audits, payments, expressReportOrders, fullAuditOrders } from "@shared/schema";
import { sql, eq, gte, lte, and, desc, count, sum, avg } from "drizzle-orm";

const router = Router();

interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  period?: "day" | "week" | "month" | "year";
}

function getDateRange(query: AnalyticsQuery): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end = new Date(now.setHours(23, 59, 59, 999));

  if (query.startDate && query.endDate) {
    start = new Date(query.startDate);
    end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    const period = query.period || "week";
    switch (period) {
      case "day":
        start = new Date();
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "month":
        start = new Date();
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case "year":
        start = new Date();
        start.setFullYear(start.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      default:
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    }
  }

  return { start, end };
}

router.get("/overview", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);

    const [
      totalVisits,
      uniqueVisitors,
      totalPageViews,
      avgSessionDuration,
      newUsers,
      expressChecksCount,
      expressReportsCount,
      fullAuditsCount,
    ] = await Promise.all([
      db.select({ count: count() })
        .from(siteVisits)
        .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end))),
      
      db.select({ count: sql<number>`count(DISTINCT ${siteVisits.visitorId})` })
        .from(siteVisits)
        .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end))),
      
      db.select({ count: count() })
        .from(pageViews)
        .where(and(gte(pageViews.enteredAt, start), lte(pageViews.enteredAt, end))),
      
      db.select({ avg: avg(siteVisits.totalDurationSeconds) })
        .from(siteVisits)
        .where(and(
          gte(siteVisits.startedAt, start), 
          lte(siteVisits.startedAt, end),
          sql`${siteVisits.totalDurationSeconds} > 0`
        )),
      
      db.select({ count: count() })
        .from(users)
        .where(and(gte(users.createdAt, start), lte(users.createdAt, end))),
      
      db.select({ count: count() })
        .from(expressChecks)
        .where(and(gte(expressChecks.createdAt, start), lte(expressChecks.createdAt, end))),
      
      db.select({ count: count() })
        .from(expressReportOrders)
        .where(and(gte(expressReportOrders.createdAt, start), lte(expressReportOrders.createdAt, end))),
      
      db.select({ count: count() })
        .from(fullAuditOrders)
        .where(and(gte(fullAuditOrders.createdAt, start), lte(fullAuditOrders.createdAt, end))),
    ]);

    res.json({
      period: { start, end },
      metrics: {
        totalVisits: totalVisits[0]?.count || 0,
        uniqueVisitors: Number(uniqueVisitors[0]?.count) || 0,
        totalPageViews: totalPageViews[0]?.count || 0,
        avgSessionDurationSeconds: Math.round(Number(avgSessionDuration[0]?.avg) || 0),
        newUsers: newUsers[0]?.count || 0,
        expressChecks: expressChecksCount[0]?.count || 0,
        expressReportOrders: expressReportsCount[0]?.count || 0,
        fullAuditOrders: fullAuditsCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Analytics overview error:", error);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

router.get("/pages", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    const limit = parseInt(req.query.limit as string) || 20;

    const topPages = await db
      .select({
        pagePath: pageViews.pagePath,
        views: count(),
        uniqueVisitors: sql<number>`count(DISTINCT ${pageViews.visitorId})`,
        avgDuration: avg(pageViews.durationSeconds),
        avgScrollDepth: avg(pageViews.scrollDepthPercent),
      })
      .from(pageViews)
      .where(and(gte(pageViews.enteredAt, start), lte(pageViews.enteredAt, end)))
      .groupBy(pageViews.pagePath)
      .orderBy(desc(count()))
      .limit(limit);

    res.json({
      period: { start, end },
      pages: topPages.map(p => ({
        ...p,
        avgDuration: Math.round(Number(p.avgDuration) || 0),
        avgScrollDepth: Math.round(Number(p.avgScrollDepth) || 0),
        uniqueVisitors: Number(p.uniqueVisitors) || 0,
      })),
    });
  } catch (error) {
    console.error("Analytics pages error:", error);
    res.status(500).json({ error: "Failed to fetch page analytics" });
  }
});

router.get("/visitors", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const visitors = await db
      .select({
        visitorId: siteVisits.visitorId,
        userId: siteVisits.userId,
        sessionsCount: count(),
        totalPageViews: sum(siteVisits.pageCount),
        totalDuration: sum(siteVisits.totalDurationSeconds),
        deviceType: siteVisits.deviceType,
        browser: siteVisits.browser,
        os: siteVisits.os,
        country: siteVisits.country,
        city: siteVisits.city,
        firstVisit: sql<Date>`MIN(${siteVisits.startedAt})`,
        lastVisit: sql<Date>`MAX(${siteVisits.startedAt})`,
      })
      .from(siteVisits)
      .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end)))
      .groupBy(
        siteVisits.visitorId,
        siteVisits.userId,
        siteVisits.deviceType,
        siteVisits.browser,
        siteVisits.os,
        siteVisits.country,
        siteVisits.city
      )
      .orderBy(desc(sql`MAX(${siteVisits.startedAt})`))
      .limit(limit)
      .offset(offset);

    res.json({
      period: { start, end },
      visitors: visitors.map(v => ({
        ...v,
        totalPageViews: Number(v.totalPageViews) || 0,
        totalDuration: Number(v.totalDuration) || 0,
      })),
    });
  } catch (error) {
    console.error("Analytics visitors error:", error);
    res.status(500).json({ error: "Failed to fetch visitor analytics" });
  }
});

router.get("/express-checks", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const checks = await db
      .select()
      .from(expressChecks)
      .where(and(gte(expressChecks.createdAt, start), lte(expressChecks.createdAt, end)))
      .orderBy(desc(expressChecks.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db
      .select({ count: count() })
      .from(expressChecks)
      .where(and(gte(expressChecks.createdAt, start), lte(expressChecks.createdAt, end)));

    const byWebsite = await db
      .select({
        websiteUrl: expressChecks.websiteUrlNormalized,
        checksCount: count(),
        avgScore: avg(expressChecks.scorePercent),
      })
      .from(expressChecks)
      .where(and(gte(expressChecks.createdAt, start), lte(expressChecks.createdAt, end)))
      .groupBy(expressChecks.websiteUrlNormalized)
      .orderBy(desc(count()))
      .limit(20);

    res.json({
      period: { start, end },
      total: totalCount[0]?.count || 0,
      checks,
      byWebsite: byWebsite.map(w => ({
        ...w,
        avgScore: Math.round(Number(w.avgScore) || 0),
      })),
    });
  } catch (error) {
    console.error("Analytics express checks error:", error);
    res.status(500).json({ error: "Failed to fetch express checks analytics" });
  }
});

router.get("/conversions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);

    const [
      expressReports,
      fullAudits,
      paidPayments,
    ] = await Promise.all([
      db.select({
        status: expressReportOrders.status,
        count: count(),
        revenue: sum(expressReportOrders.price),
      })
        .from(expressReportOrders)
        .where(and(gte(expressReportOrders.createdAt, start), lte(expressReportOrders.createdAt, end)))
        .groupBy(expressReportOrders.status),
      
      db.select({
        status: fullAuditOrders.status,
        count: count(),
      })
        .from(fullAuditOrders)
        .where(and(gte(fullAuditOrders.createdAt, start), lte(fullAuditOrders.createdAt, end)))
        .groupBy(fullAuditOrders.status),
      
      db.select({
        count: count(),
        revenue: sum(payments.amount),
      })
        .from(payments)
        .where(and(
          gte(payments.createdAt, start), 
          lte(payments.createdAt, end),
          eq(payments.status, "succeeded")
        )),
    ]);

    res.json({
      period: { start, end },
      expressReports: expressReports.map(r => ({
        ...r,
        revenue: Number(r.revenue) || 0,
      })),
      fullAudits: fullAudits,
      totalPaidPayments: {
        count: paidPayments[0]?.count || 0,
        revenue: Number(paidPayments[0]?.revenue) || 0,
      },
    });
  } catch (error) {
    console.error("Analytics conversions error:", error);
    res.status(500).json({ error: "Failed to fetch conversion analytics" });
  }
});

router.get("/timeline", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    const groupBy = (req.query.groupBy as string) || "day";

    let dateFormat: string;
    switch (groupBy) {
      case "hour":
        dateFormat = "YYYY-MM-DD HH24:00";
        break;
      case "day":
        dateFormat = "YYYY-MM-DD";
        break;
      case "week":
        dateFormat = "IYYY-IW";
        break;
      case "month":
        dateFormat = "YYYY-MM";
        break;
      default:
        dateFormat = "YYYY-MM-DD";
    }

    const visitsTimeline = await db
      .select({
        period: sql<string>`TO_CHAR(${siteVisits.startedAt}, ${dateFormat})`,
        visits: count(),
        uniqueVisitors: sql<number>`count(DISTINCT ${siteVisits.visitorId})`,
      })
      .from(siteVisits)
      .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end)))
      .groupBy(sql`TO_CHAR(${siteVisits.startedAt}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${siteVisits.startedAt}, ${dateFormat})`);

    const expressTimeline = await db
      .select({
        period: sql<string>`TO_CHAR(${expressChecks.createdAt}, ${dateFormat})`,
        checks: count(),
      })
      .from(expressChecks)
      .where(and(gte(expressChecks.createdAt, start), lte(expressChecks.createdAt, end)))
      .groupBy(sql`TO_CHAR(${expressChecks.createdAt}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${expressChecks.createdAt}, ${dateFormat})`);

    res.json({
      period: { start, end },
      groupBy,
      visits: visitsTimeline.map(v => ({
        ...v,
        uniqueVisitors: Number(v.uniqueVisitors) || 0,
      })),
      expressChecks: expressTimeline,
    });
  } catch (error) {
    console.error("Analytics timeline error:", error);
    res.status(500).json({ error: "Failed to fetch timeline analytics" });
  }
});

router.get("/devices", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);

    const [byDevice, byBrowser, byOS] = await Promise.all([
      db.select({
        deviceType: siteVisits.deviceType,
        count: count(),
        uniqueVisitors: sql<number>`count(DISTINCT ${siteVisits.visitorId})`,
      })
        .from(siteVisits)
        .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end)))
        .groupBy(siteVisits.deviceType)
        .orderBy(desc(count())),

      db.select({
        browser: siteVisits.browser,
        count: count(),
        uniqueVisitors: sql<number>`count(DISTINCT ${siteVisits.visitorId})`,
      })
        .from(siteVisits)
        .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end)))
        .groupBy(siteVisits.browser)
        .orderBy(desc(count()))
        .limit(10),

      db.select({
        os: siteVisits.os,
        count: count(),
        uniqueVisitors: sql<number>`count(DISTINCT ${siteVisits.visitorId})`,
      })
        .from(siteVisits)
        .where(and(gte(siteVisits.startedAt, start), lte(siteVisits.startedAt, end)))
        .groupBy(siteVisits.os)
        .orderBy(desc(count()))
        .limit(10),
    ]);

    res.json({
      period: { start, end },
      byDevice: byDevice.map(d => ({ ...d, uniqueVisitors: Number(d.uniqueVisitors) || 0 })),
      byBrowser: byBrowser.map(b => ({ ...b, uniqueVisitors: Number(b.uniqueVisitors) || 0 })),
      byOS: byOS.map(o => ({ ...o, uniqueVisitors: Number(o.uniqueVisitors) || 0 })),
    });
  } catch (error) {
    console.error("Analytics devices error:", error);
    res.status(500).json({ error: "Failed to fetch device analytics" });
  }
});

router.post("/track/visit", async (req: Request, res: Response) => {
  try {
    const {
      visitorId,
      sessionId,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      deviceType,
      browser,
      os,
    } = req.body;

    if (!visitorId || !sessionId) {
      return res.status(400).json({ error: "visitorId and sessionId are required" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                      req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    const [visit] = await db.insert(siteVisits).values({
      visitorId,
      sessionId,
      userId: req.session.userId || null,
      ipAddress,
      userAgent,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      deviceType,
      browser,
      os,
    }).returning();

    res.json({ visitId: visit.id });
  } catch (error) {
    console.error("Track visit error:", error);
    res.status(500).json({ error: "Failed to track visit" });
  }
});

router.post("/track/pageview", async (req: Request, res: Response) => {
  try {
    const {
      visitId,
      visitorId,
      sessionId,
      pagePath,
      pageTitle,
      referrerPath,
    } = req.body;

    if (!visitorId || !sessionId || !pagePath) {
      return res.status(400).json({ error: "visitorId, sessionId and pagePath are required" });
    }

    const [pageView] = await db.insert(pageViews).values({
      visitId: visitId || null,
      visitorId,
      sessionId,
      userId: req.session.userId || null,
      pagePath,
      pageTitle,
      referrerPath,
    }).returning();

    if (visitId) {
      await db.update(siteVisits)
        .set({ pageCount: sql`${siteVisits.pageCount} + 1` })
        .where(eq(siteVisits.id, visitId));
    }

    res.json({ pageViewId: pageView.id });
  } catch (error) {
    console.error("Track pageview error:", error);
    res.status(500).json({ error: "Failed to track pageview" });
  }
});

router.post("/track/pageview/:id/update", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { durationSeconds, scrollDepthPercent } = req.body;

    await db.update(pageViews)
      .set({
        exitedAt: new Date(),
        durationSeconds: durationSeconds || 0,
        scrollDepthPercent: scrollDepthPercent || 0,
      })
      .where(eq(pageViews.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Update pageview error:", error);
    res.status(500).json({ error: "Failed to update pageview" });
  }
});

router.post("/track/visit/:id/end", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { totalDurationSeconds } = req.body;

    await db.update(siteVisits)
      .set({
        endedAt: new Date(),
        totalDurationSeconds: totalDurationSeconds || 0,
      })
      .where(eq(siteVisits.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("End visit error:", error);
    res.status(500).json({ error: "Failed to end visit" });
  }
});

router.post("/track/express-check", async (req: Request, res: Response) => {
  try {
    const {
      visitorId,
      websiteUrl,
      websiteUrlNormalized,
      companyName,
      email,
      phone,
      inn,
      scorePercent,
      severity,
      resultJson,
      conversionType,
    } = req.body;

    if (!websiteUrl) {
      return res.status(400).json({ error: "websiteUrl is required" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || 
                      req.socket.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    const [check] = await db.insert(expressChecks).values({
      visitorId,
      userId: req.session.userId || null,
      websiteUrl,
      websiteUrlNormalized,
      companyName,
      email,
      phone,
      inn,
      scorePercent,
      severity,
      resultJson,
      ipAddress,
      userAgent,
      conversionType,
    }).returning();

    res.json({ checkId: check.id });
  } catch (error) {
    console.error("Track express check error:", error);
    res.status(500).json({ error: "Failed to track express check" });
  }
});

router.get("/users-detail", requireAdmin, async (req: Request, res: Response) => {
  try {
    const usersData = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(500);

    if (usersData.length === 0) {
      return res.json([]);
    }

    const userIds = usersData.map(u => u.id);
    
    const expressChecksCounts = await db.select({
      userId: expressChecks.userId,
      count: count(),
    })
    .from(expressChecks)
    .where(sql`${expressChecks.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`,`)})`)
    .groupBy(expressChecks.userId);

    const expressCounts = new Map(expressChecksCounts.map(e => [e.userId, e.count]));

    const ordersData = await db.select({
      userId: expressReportOrders.userId,
      count: count(),
    })
    .from(expressReportOrders)
    .where(sql`${expressReportOrders.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`,`)})`)
    .groupBy(expressReportOrders.userId);

    const orderCounts = new Map(ordersData.map(o => [o.userId, o.count]));

    const result = usersData.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt,
      expressChecksCount: expressCounts.get(user.id) || 0,
      ordersCount: orderCounts.get(user.id) || 0,
      lastActiveAt: null,
    }));

    res.json(result);
  } catch (error) {
    console.error("Users detail error:", error);
    res.status(500).json({ error: "Failed to fetch users detail" });
  }
});

router.get("/express-detail", requireAdmin, async (req: Request, res: Response) => {
  try {
    const checksData = await db.select({
      id: expressChecks.id,
      websiteUrl: expressChecks.websiteUrl,
      scorePercent: expressChecks.scorePercent,
      severity: expressChecks.severity,
      createdAt: expressChecks.createdAt,
      userId: expressChecks.userId,
      conversionType: expressChecks.conversionType,
    })
    .from(expressChecks)
    .orderBy(desc(expressChecks.createdAt))
    .limit(500);

    if (checksData.length === 0) {
      return res.json([]);
    }

    const userIds = checksData.filter(c => c.userId).map(c => c.userId!);
    const uniqueUserIds = Array.from(new Set(userIds));
    
    let usersMap = new Map<number, { name: string | null; email: string }>();
    if (uniqueUserIds.length > 0) {
      const usersData = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(sql`${users.id} IN (${sql.join(uniqueUserIds.map(id => sql`${id}`), sql`,`)})`);
      
      usersMap = new Map(usersData.map(u => [u.id, { name: u.name, email: u.email }]));
    }

    const result = checksData.map(check => {
      const user = check.userId ? usersMap.get(check.userId) : null;
      return {
        id: check.id,
        token: "",
        websiteUrl: check.websiteUrl,
        status: "completed",
        scorePercent: check.scorePercent,
        severity: check.severity,
        passedCount: null,
        warningCount: null,
        failedCount: null,
        createdAt: check.createdAt,
        userId: check.userId,
        userName: user?.name || null,
        userEmail: user?.email || null,
        fullReportPurchased: check.conversionType === "paid_report",
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Express detail error:", error);
    res.status(500).json({ error: "Failed to fetch express checks detail" });
  }
});

export default router;
