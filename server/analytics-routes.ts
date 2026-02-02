import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { orders, users } from "@shared/schema";
import { sql, gte, lte, and, desc, count, eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

import crypto from "crypto";
const JWT_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

const router = Router();

function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "admin" && decoded.role !== "superadmin") {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  period?: "day" | "week" | "month" | "year";
}

function getDateRange(query: AnalyticsQuery): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  const end = new Date();
  end.setHours(23, 59, 59, 999);

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

  return { start, end };
}

router.get("/overview", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);

    const [
      newUsersResult,
      expressChecksResult,
      paidOrdersResult,
    ] = await Promise.all([
      db.select({ count: count() })
        .from(users)
        .where(and(
          gte(users.createdAt, start),
          lte(users.createdAt, end)
        )),
      
      db.select({ count: count() })
        .from(orders)
        .where(and(
          eq(orders.orderType, "express"),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        )),
      
      db.select({ count: count() })
        .from(orders)
        .where(and(
          eq(orders.status, "paid"),
          gte(orders.createdAt, start),
          lte(orders.createdAt, end)
        )),
    ]);

    const metrics = {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalPageViews: 0,
      avgSessionDurationSeconds: 0,
      newUsers: newUsersResult[0]?.count || 0,
      expressChecks: expressChecksResult[0]?.count || 0,
      expressReportOrders: paidOrdersResult[0]?.count || 0,
      fullAuditOrders: 0,
    };

    res.json({ metrics });
  } catch (error) {
    console.error("[Analytics] Overview error:", error);
    res.status(500).json({ error: "Ошибка получения аналитики" });
  }
});

router.get("/pages", verifyAdmin, async (req: Request, res: Response) => {
  try {
    res.json({ pages: [] });
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения статистики страниц" });
  }
});

router.get("/express-checks", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    
    const checks = await db.select()
      .from(orders)
      .where(and(
        eq(orders.orderType, "express"),
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      ))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const byWebsite = checks.reduce((acc: any[], order) => {
      const existing = acc.find(w => w.websiteUrl === order.siteUrl);
      if (existing) {
        existing.checksCount++;
        existing.avgScore = Math.round((existing.avgScore * (existing.checksCount - 1) + (order.totalScore || 0)) / existing.checksCount);
      } else {
        acc.push({
          websiteUrl: order.siteUrl,
          checksCount: 1,
          avgScore: order.totalScore || 0,
        });
      }
      return acc;
    }, []).sort((a, b) => b.checksCount - a.checksCount);

    res.json({
      total: checks.length,
      checks: checks.map(c => ({
        id: c.id,
        websiteUrl: c.siteUrl,
        email: c.email,
        scorePercent: c.totalScore,
        createdAt: c.createdAt,
      })),
      byWebsite,
    });
  } catch (error) {
    console.error("[Analytics] Express checks error:", error);
    res.status(500).json({ error: "Ошибка получения статистики проверок" });
  }
});

router.get("/conversions", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { start, end } = getDateRange(req.query as AnalyticsQuery);
    
    const [pending, paid, completed] = await Promise.all([
      db.select({ count: count() }).from(orders)
        .where(and(eq(orders.status, "pending"), gte(orders.createdAt, start), lte(orders.createdAt, end))),
      db.select({ count: count() }).from(orders)
        .where(and(eq(orders.status, "paid"), gte(orders.createdAt, start), lte(orders.createdAt, end))),
      db.select({ count: count() }).from(orders)
        .where(and(eq(orders.status, "completed"), gte(orders.createdAt, start), lte(orders.createdAt, end))),
    ]);

    res.json({
      expressReports: [
        { status: "pending", count: pending[0]?.count || 0, revenue: 0 },
        { status: "paid", count: paid[0]?.count || 0, revenue: (paid[0]?.count || 0) * 900 },
        { status: "completed", count: completed[0]?.count || 0, revenue: (completed[0]?.count || 0) * 900 },
      ],
    });
  } catch (error) {
    console.error("[Analytics] Conversions error:", error);
    res.status(500).json({ error: "Ошибка получения конверсий" });
  }
});

router.get("/timeline", verifyAdmin, async (req: Request, res: Response) => {
  try {
    res.json({ visits: [] });
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения таймлайна" });
  }
});

router.get("/devices", verifyAdmin, async (req: Request, res: Response) => {
  try {
    res.json({ byDevice: [], byBrowser: [], byOS: [] });
  } catch (error) {
    res.status(500).json({ error: "Ошибка получения статистики устройств" });
  }
});

router.get("/users-detail", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
    
    const userDetails = await Promise.all(allUsers.map(async (user) => {
      const [ordersResult] = await Promise.all([
        db.select({ count: count() }).from(orders).where(eq(orders.userId, user.id)),
      ]);
      
      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        phone: user.phone,
        role: user.role,
        emailVerified: false,
        createdAt: user.createdAt,
        expressChecksCount: 0,
        ordersCount: ordersResult[0]?.count || 0,
        lastActiveAt: null,
      };
    }));

    res.json(userDetails);
  } catch (error) {
    console.error("[Analytics] Users detail error:", error);
    res.status(500).json({ error: "Ошибка получения пользователей" });
  }
});

router.get("/express-checks-detail", verifyAdmin, async (req: Request, res: Response) => {
  try {
    const checks = await db.select()
      .from(orders)
      .where(eq(orders.orderType, "express"))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const details = checks.map(c => ({
      id: c.id,
      token: c.id,
      websiteUrl: c.siteUrl,
      status: c.status || "pending",
      scorePercent: c.totalScore,
      severity: c.totalScore ? (c.totalScore >= 80 ? "low" : c.totalScore >= 50 ? "medium" : "high") : null,
      passedCount: null,
      warningCount: null,
      failedCount: null,
      createdAt: c.createdAt,
      userId: c.userId,
      userName: null,
      userEmail: c.email,
      fullReportPurchased: c.status === "paid" || c.status === "completed",
    }));

    res.json(details);
  } catch (error) {
    console.error("[Analytics] Express checks detail error:", error);
    res.status(500).json({ error: "Ошибка получения проверок" });
  }
});

export const analyticsRouter = router;
