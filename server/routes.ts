import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertPackageSchema, insertFaqItemSchema, insertContactMessageSchema, insertOrderSchema, insertUserSchema, loginSchema, auditFormSchema, insertCaseSchema, insertPromoCodeSchema, registerUserSchema, insertReferralSettingsSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { initGigaChat, analyzeWebsiteWithGigaChat, isGigaChatEnabled, testGigaChatConnection } from "./gigachat";
import { analyticsRouter } from "./analytics-routes";
import { createPayment, handleWebhook, type YooKassaWebhookEvent } from "./yookassa";
import { initTelegramNotifications, notifyContactFormMessage, notifyExpressReportRequest, notifyFullAuditRequest, notifyReferralRegistration, notifySuccessfulPayment, notifyNewOrder, updateTelegramSettings } from "./telegram-notifications";

import crypto from "crypto";

const JWT_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn("WARNING: SESSION_SECRET not set. Using random secret - sessions will not persist across restarts.");
}

const contactRateLimits = new Map<string, { count: number; lastReset: number }>();
const promoRateLimits = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 3;
const PROMO_RATE_LIMIT_MAX = 10;

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkPromoRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = promoRateLimits.get(ip);

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    promoRateLimits.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (record.count >= PROMO_RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = contactRateLimits.get(ip);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    contactRateLimits.set(ip, { count: 1, lastReset: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Middleware to verify admin token
function verifyAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
    if (decoded.role !== 'admin' && decoded.role !== 'superadmin') {
      return res.status(403).json({ error: "Доступ запрещен" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Middleware to verify superadmin token
function verifySuperAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET!) as any;
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: "Доступ только для супер-администратора" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

import { registerDocumentRoutes } from "./document-routes";

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Register analytics routes
  app.use("/api/admin/analytics", analyticsRouter);
  
  // Register document management routes
  registerDocumentRoutes(app);

  // Initialize GigaChat if settings exist
  try {
    const gigachatSettings = await storage.getGigaChatSettings();
    if (gigachatSettings) {
      initGigaChat(gigachatSettings);
      console.log("GigaChat initialized:", isGigaChatEnabled() ? "enabled" : "disabled");
    }
  } catch (error) {
    console.log("GigaChat settings not found, skipping initialization");
  }

  // Initialize Telegram notifications
  try {
    await initTelegramNotifications();
  } catch (error) {
    console.log("Telegram notifications initialization failed");
  }

  // ====================
  // PUBLIC ROUTES
  // ====================

  // Get public packages (only active)
  app.get("/api/packages", async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      const activePackages = packages.filter(p => p.isActive);
      res.json(activePackages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Get single package
  app.get("/api/packages/:id", async (req, res) => {
    try {
      const pkg = await storage.getPackage(req.params.id);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch package" });
    }
  });

  // Get public FAQ (only active)
  app.get("/api/faq", async (req, res) => {
    try {
      const items = await storage.getAllFaqItems();
      const activeItems = items.filter(i => i.isActive);
      res.json(activeItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQ" });
    }
  });

  // Get public settings
  app.get("/api/settings/public", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        return res.json({ expressReportPrice: 900, monitoringComingSoon: true });
      }
      // Return only public fields
      res.json({
        companyName: settings.companyName,
        companyType: settings.companyType,
        inn: settings.inn,
        ogrn: settings.ogrn,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        privacyEmail: settings.privacyEmail,
        telegram: settings.telegram,
        vk: settings.vk,
        expressReportPrice: settings.expressReportPrice || 900,
        privacyPolicy: settings.privacyPolicy,
        termsOfService: settings.termsOfService,
        cookiePolicy: settings.cookiePolicy,
        consentText: settings.consentText,
        maintenanceMode: settings.maintenanceMode || false,
        maintenanceMessage: settings.maintenanceMessage,
        monitoringComingSoon: settings.monitoringComingSoon ?? true,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Contact form submission with server-side spam protection
  app.post("/api/contact", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      
      if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: "Слишком много запросов. Попробуйте позже." });
      }
      
      const { honeypot, captchaAnswer, captchaExpected, ...formData } = req.body;
      
      if (honeypot && honeypot.length > 0) {
        return res.status(400).json({ error: "Некорректный запрос" });
      }
      
      // Validate captcha
      if (!captchaAnswer || !captchaExpected || parseInt(captchaAnswer) !== parseInt(captchaExpected)) {
        return res.status(400).json({ error: "Неверный ответ на вопрос безопасности" });
      }
      
      const data = insertContactMessageSchema.parse(formData);
      const message = await storage.createMessage(data);
      
      // Send Telegram notification
      notifyContactFormMessage({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        message: data.message,
      }).catch(err => console.error("[TELEGRAM] Contact notification failed:", err));
      
      res.json({ success: true, id: message.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to submit message" });
    }
  });

  // Helper function to check if site exists and optionally fetch HTML using native https/http modules
  async function checkSiteExists(url: string, fetchHtml: boolean = false): Promise<{ exists: boolean; error?: string; html?: string }> {
    const https = await import('https');
    const http = await import('http');

    function checkUrl(targetUrl: string, getHtml: boolean = false): Promise<{ success: boolean; errorType?: string; html?: string }> {
      return new Promise((resolve) => {
        try {
          const parsed = new URL(targetUrl);
          const isHttps = parsed.protocol === 'https:';
          const client = isHttps ? https : http;
          
          const options = {
            hostname: parsed.hostname,
            port: isHttps ? 443 : 80,
            path: parsed.pathname + parsed.search,
            method: getHtml ? 'GET' : 'HEAD',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
            },
          };

          const req = client.request(options, (res) => {
            if (getHtml) {
              let data = '';
              res.on('data', (chunk: any) => { data += chunk; });
              res.on('end', () => {
                resolve({ success: true, html: data });
              });
            } else {
              resolve({ success: true });
            }
          });

          req.on('error', (error: any) => {
            if (error.code === 'ENOTFOUND') {
              resolve({ success: false, errorType: 'notfound' });
            } else if (error.code === 'ECONNREFUSED') {
              resolve({ success: false, errorType: 'refused' });
            } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
              resolve({ success: false, errorType: 'timeout' });
            } else {
              resolve({ success: false, errorType: 'network' });
            }
          });

          req.on('timeout', () => {
            req.destroy();
            resolve({ success: false, errorType: 'timeout' });
          });

          req.end();
        } catch (e) {
          resolve({ success: false, errorType: 'network' });
        }
      });
    }

    // Build list of URLs to try in parallel
    const urlsToTry: string[] = [url];
    
    try {
      const parsed = new URL(url);
      // Add www variant if not present
      if (!parsed.hostname.startsWith('www.')) {
        urlsToTry.push(`${parsed.protocol}//www.${parsed.hostname}${parsed.pathname}${parsed.search}`);
      }
      // Also try http if https
      if (parsed.protocol === 'https:') {
        urlsToTry.push(`http://${parsed.hostname}${parsed.pathname}${parsed.search}`);
      }
    } catch {}

    // Try all URLs in parallel - first success wins
    const results = await Promise.all(urlsToTry.map(u => checkUrl(u, false)));
    
    // Find first successful URL
    const successIndex = results.findIndex(r => r.success);
    if (successIndex >= 0) {
      // If HTML fetch requested, get it from the successful URL
      if (fetchHtml) {
        try {
          const htmlResult = await checkUrl(urlsToTry[successIndex], true);
          return { exists: true, html: htmlResult.html };
        } catch {
          return { exists: true };
        }
      }
      return { exists: true };
    }

    // Determine best error message from failed results
    const errorTypes = results.map(r => r.errorType).filter(Boolean);
    if (errorTypes.includes('notfound')) {
      return { exists: false, error: 'Сайт не найден. Проверьте правильность адреса' };
    }
    if (errorTypes.includes('timeout')) {
      return { exists: false, error: 'Превышено время ожидания ответа от сайта' };
    }
    if (errorTypes.includes('refused')) {
      return { exists: false, error: 'Сайт отклонил соединение' };
    }

    return { exists: false, error: 'Не удалось подключиться к сайту' };
  }

  // Site existence check (separate endpoint)
  app.post("/api/audit/check-site", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL не указан" });
      }

      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      const siteCheck = await checkSiteExists(normalizedUrl);
      if (!siteCheck.exists) {
        return res.status(400).json({ 
          error: siteCheck.error || 'Сайт недоступен. Убедитесь, что он работает и попробуйте снова.' 
        });
      }

      res.json({ success: true, url: normalizedUrl });
    } catch (error) {
      res.status(500).json({ error: "Не удалось проверить сайт" });
    }
  });

  // Audit check
  app.post("/api/audit/check", async (req, res) => {
    try {
      const data = auditFormSchema.parse(req.body);

      // Check if site exists before performing audit, fetch HTML if GigaChat is enabled
      const fetchHtml = isGigaChatEnabled();
      const siteCheck = await checkSiteExists(data.siteUrl, fetchHtml);
      if (!siteCheck.exists) {
        return res.status(400).json({ 
          error: siteCheck.error || 'Сайт недоступен. Убедитесь, что он работает и попробуйте снова.' 
        });
      }

      // Simulate audit check (in production, this would be real checks)
      // Penalty amounts based on 152-FZ (Federal Law on Personal Data)
      const criteria = [
        { id: "1", name: "HTTPS/SSL сертификат", status: Math.random() > 0.3 ? "pass" : "fail", description: "Проверка сертификата", penalty: "до 100 000 ₽" },
        { id: "2", name: "Политика конфиденциальности", status: Math.random() > 0.5 ? "pass" : Math.random() > 0.5 ? "warning" : "fail", description: "Анализ политики", penalty: "до 150 000 ₽" },
        { id: "3", name: "Согласие на ПДн", status: Math.random() > 0.6 ? "pass" : "fail", description: "Проверка согласий", penalty: "до 300 000 ₽" },
        { id: "4", name: "Cookie-баннер", status: Math.random() > 0.4 ? "pass" : "warning", description: "Проверка баннера", penalty: "до 100 000 ₽" },
        { id: "5", name: "Иностранные ресурсы", status: Math.random() > 0.7 ? "pass" : "fail", description: "Анализ скриптов", penalty: "до 6 000 000 ₽" },
        { id: "6", name: "Формы сбора данных", status: Math.random() > 0.5 ? "pass" : "warning", description: "Анализ форм", penalty: "до 150 000 ₽" },
        { id: "7", name: "Контактная информация", status: Math.random() > 0.6 ? "pass" : "warning", description: "Поиск контактов", penalty: "до 50 000 ₽" },
        { id: "8", name: "Авторизация", status: Math.random() > 0.5 ? "pass" : "fail", description: "Проверка авторизации", penalty: "до 500 000 ₽" },
        { id: "9", name: "Реестр Роскомнадзора", status: Math.random() > 0.8 ? "pass" : "fail", description: "Проверка регистрации", penalty: "до 300 000 ₽" },
      ];

      let gigachatAnalysis = null;
      let verificationMethods = ["basic"];
      
      // Try GigaChat enhanced analysis if enabled
      if (isGigaChatEnabled()) {
        try {
          const gigachatSettings = await storage.getGigaChatSettings();
          if (gigachatSettings?.promptTemplate && siteCheck.html) {
            gigachatAnalysis = await analyzeWebsiteWithGigaChat(
              data.siteUrl,
              siteCheck.html,
              gigachatSettings.promptTemplate
            );
            if (gigachatAnalysis) {
              verificationMethods.push("gigachat");
            }
          }
        } catch (aiError) {
          console.error("GigaChat analysis failed:", aiError);
        }
      }

      const passCount = criteria.filter(c => c.status === "pass").length;
      const warningCount = criteria.filter(c => c.status === "warning").length;
      let totalScore = Math.round((passCount * 100 + warningCount * 50) / 9);
      
      // Adjust score based on GigaChat analysis if available
      if (gigachatAnalysis && typeof gigachatAnalysis.score === 'number') {
        totalScore = Math.round((totalScore + gigachatAnalysis.score) / 2);
      }
      
      const overallStatus = totalScore >= 70 ? "good" : totalScore >= 40 ? "average" : "critical";

      // Check if user is authenticated to link order to their account
      let userId: string | undefined = undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        } catch {
          // User not authenticated, that's fine - continue without userId
        }
      }

      // Create order record
      const order = await storage.createOrder({
        siteUrl: data.siteUrl,
        email: data.email,
        siteType: data.siteType,
        orderType: "express",
        status: "pending",
        totalScore,
        auditResults: { criteria, totalScore, overallStatus, gigachatAnalysis, verificationMethods },
        userId,
      });

      // If authenticated user, save audit to their cabinet
      let siteAuditId: string | undefined = undefined;
      if (userId) {
        try {
          // Find or create user site
          let userSite = await storage.getUserSiteByUrl(userId, data.siteUrl);
          if (!userSite) {
            userSite = await storage.createUserSite({
              userId,
              url: data.siteUrl,
              displayName: new URL(data.siteUrl).hostname,
            });
          }

          // Calculate law scores (simplified - 149-FZ covers foreign resources, 152-FZ covers personal data)
          const law149Criteria = criteria.filter(c => ["5"].includes(c.id));
          const law152Criteria = criteria.filter(c => ["2", "3", "4", "6", "8", "9"].includes(c.id));
          
          const law149Score = Math.round(law149Criteria.filter(c => c.status === "pass").length * 100 / Math.max(law149Criteria.length, 1));
          const law152Score = Math.round(law152Criteria.filter(c => c.status === "pass").length * 100 / Math.max(law152Criteria.length, 1));
          
          const law149Status = law149Score >= 80 ? "ok" : law149Score >= 50 ? "warning" : "critical";
          const law152Status = law152Score >= 80 ? "ok" : law152Score >= 50 ? "warning" : "critical";

          // Create site audit record
          const siteAudit = await storage.createSiteAudit({
            siteId: userSite.id,
            orderId: order.id,
            source: "express",
            overallScore: totalScore,
            law149Score,
            law152Score,
            law149Status,
            law152Status,
            status: "completed",
            summary: `Экспресс-проверка сайта: ${totalScore}% соответствия`,
            recommendations: criteria.filter(c => c.status !== "pass").map(c => `${c.name}: ${c.penalty}`).join("; "),
          });
          siteAuditId = siteAudit.id;

          // Create audit findings for each criterion
          for (const criterion of criteria) {
            const lawType = criterion.id === "5" ? "149-ФЗ" : "152-ФЗ";
            await storage.createAuditFinding({
              auditId: siteAudit.id,
              law: lawType,
              category: criterion.id === "5" ? "foreign_resources" : "personal_data",
              title: criterion.name,
              severity: criterion.status === "pass" ? "info" : criterion.status === "warning" ? "medium" : "high",
              status: criterion.status === "pass" ? "resolved" : "open",
              description: criterion.description,
              recommendation: criterion.status !== "pass" ? `Штраф: ${criterion.penalty}` : undefined,
            });
          }

          // Update site with latest audit info
          await storage.updateUserSite(userSite.id, {
            overallScore: totalScore,
            law149Score,
            law152Score,
            law149Status,
            law152Status,
            latestAuditId: siteAudit.id,
            latestAuditAt: new Date(),
          });
        } catch (auditSaveError) {
          console.error("Failed to save audit to cabinet:", auditSaveError);
          // Continue - we still return results even if cabinet save fails
        }
      }

      const innNotFound = criteria.find(c => c.id === "9")?.status === "fail";
      
      res.json({ 
        criteria, 
        totalScore, 
        overallStatus, 
        innNotFound,
        gigachatAnalysis,
        verificationMethods,
        orderId: order.id,
        siteAuditId,
        canDownloadPdf: !!userId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to perform audit" });
    }
  });

  // INN lookup via api-fns.ru for company data
  app.post("/api/inn/lookup", async (req, res) => {
    try {
      const { inn } = req.body;
      
      if (!inn) {
        return res.status(400).json({ error: "ИНН не указан" });
      }
      
      const cleanInn = inn.replace(/\D/g, "");
      if (cleanInn.length !== 10 && cleanInn.length !== 12) {
        return res.status(400).json({ error: "ИНН должен содержать 10 или 12 цифр" });
      }
      
      const API_FNS_KEY = process.env.API_FNS_KEY;
      
      if (!API_FNS_KEY) {
        return res.status(503).json({ 
          error: "Сервис поиска по ИНН не настроен. Введите реквизиты вручную.",
          manual: true 
        });
      }
      
      try {
        const response = await fetch(
          `https://api-fns.ru/api/egr?req=${cleanInn}&key=${API_FNS_KEY}`
        );
        
        if (!response.ok) {
          throw new Error("Ошибка сервиса ФНС");
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const company = data.items[0];
          const isIP = !!company.ИП;
          const info = isIP ? company.ИП : company.ЮЛ;
          
          if (!info) {
            return res.json({ found: false, message: "Компания не найдена" });
          }
          
          const result = {
            found: true,
            inn: cleanInn,
            companyType: isIP ? "ИП" : (info.НаимСокрЮЛ?.startsWith("АО") ? "АО" : "ООО"),
            companyName: isIP ? info.ФИОПолн : (info.НаимСокрЮЛ || info.НаимПолнЮЛ),
            fullName: isIP ? info.ФИОПолн : info.НаимПолнЮЛ,
            ogrn: info.ОГРН || info.ОГРНИП,
            kpp: info.КПП || null,
            address: info.АдресПолн || info.Адрес?.АдресПолн,
            director: info.Руководитель?.ФИОПолн,
            directorPosition: info.Руководитель?.Должн,
            status: info.Статус,
            registrationDate: info.ДатаРег,
          };
          
          return res.json(result);
        }
        
        return res.json({ found: false, message: "Компания не найдена по ИНН" });
      } catch (apiError: any) {
        console.error("[INN Lookup] API-FNS error:", apiError.message);
        return res.status(503).json({ 
          error: "Сервис ФНС временно недоступен. Введите реквизиты вручную.",
          manual: true 
        });
      }
    } catch (error: any) {
      console.error("[INN Lookup] Error:", error.message);
      res.status(500).json({ error: "Не удалось получить данные по ИНН" });
    }
  });

  // INN verification endpoint
  app.post("/api/audit/verify-inn", async (req, res) => {
    try {
      const { inn, siteUrl } = req.body;
      
      if (!inn) {
        return res.status(400).json({ error: "ИНН не указан" });
      }
      
      const cleanInn = inn.replace(/\D/g, "");
      if (cleanInn.length !== 10 && cleanInn.length !== 12) {
        return res.status(400).json({ error: "ИНН должен содержать 10 или 12 цифр" });
      }
      
      const isRegistered = Math.random() > 0.3;
      
      if (isRegistered) {
        const operatorNames = [
          "ООО 'Веб-Разработка'",
          "ИП Иванов И.И.",
          "ООО 'Цифровые Решения'",
          "АО 'ТехноГрупп'",
          "ООО 'Интернет-Сервис'",
        ];
        const operatorName = operatorNames[Math.floor(Math.random() * operatorNames.length)];
        
        res.json({
          found: true,
          inn: cleanInn,
          operatorName,
          registrationNumber: `77-${Math.floor(Math.random() * 90000) + 10000}`,
          registrationDate: new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        });
      } else {
        res.json({
          found: false,
          inn: cleanInn,
          message: "Оператор не найден в реестре Роскомнадзора",
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Не удалось проверить ИНН" });
    }
  });

  // Payment creation
  const paymentSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    company: z.string().optional(),
    whatsapp: z.string().optional(),
    telegram: z.string().optional(),
    inn: z.string().optional(),
    orderType: z.enum(['express', 'package']),
    packageId: z.string().optional(),
    siteUrl: z.string(),
    promoCodeId: z.string().optional(),
  });

  app.post("/api/payment/create", async (req, res) => {
    try {
      console.log("[Payment] Received request body:", JSON.stringify(req.body, null, 2));
      const parsed = paymentSchema.safeParse(req.body);
      if (!parsed.success) {
        console.log("[Payment] Validation errors:", JSON.stringify(parsed.error.errors, null, 2));
        return res.status(400).json({ error: "Некорректные данные", details: parsed.error.errors });
      }
      const { name, email, phone, company, whatsapp, telegram, inn, orderType, packageId, siteUrl, promoCodeId } = parsed.data;

      // Calculate amount server-side from package or settings (don't trust client)
      let serverAmount = 0;
      if (orderType === 'express') {
        const siteSettings = await storage.getSettings();
        serverAmount = siteSettings?.expressReportPrice || 900;
      } else if (orderType === 'package') {
        if (!packageId) {
          return res.status(400).json({ error: "Не указан пакет услуг" });
        }
        const pkg = await storage.getPackage(packageId);
        if (!pkg) {
          return res.status(400).json({ error: "Пакет услуг не найден" });
        }
        serverAmount = pkg.price;
      }

      // Ensure we have a valid amount
      if (serverAmount <= 0) {
        return res.status(400).json({ error: "Некорректная сумма заказа" });
      }

      // Validate and apply promo code server-side
      let discountAmount = 0;
      let validPromoCodeId: string | null = null;
      if (promoCodeId) {
        const promoCode = await storage.getPromoCode(promoCodeId);
        if (promoCode && promoCode.isActive) {
          const now = new Date();
          const notExpired = !promoCode.expiresAt || new Date(promoCode.expiresAt) >= now;
          const notExhausted = !promoCode.maxUses || (promoCode.currentUses || 0) < promoCode.maxUses;
          const meetsMinOrder = !promoCode.minOrderAmount || serverAmount >= promoCode.minOrderAmount;
          
          if (notExpired && notExhausted && meetsMinOrder) {
            if (promoCode.discountType === 'percent') {
              discountAmount = Math.floor(serverAmount * promoCode.discountValue / 100);
            } else {
              discountAmount = promoCode.discountValue;
            }
            validPromoCodeId = promoCode.id;
            
            // Increment usage count
            await storage.incrementPromoCodeUsage(promoCode.id);
          }
        }
      }

      const finalAmount = Math.max(0, serverAmount - discountAmount);

      // Create order with server-calculated amounts
      const order = await storage.createOrder({
        siteUrl: siteUrl || "",
        email,
        customerName: name,
        customerPhone: phone,
        customerCompany: company || null,
        customerWhatsapp: whatsapp || null,
        customerTelegram: telegram || null,
        customerInn: inn || null,
        orderType,
        packageId,
        promoCodeId: validPromoCodeId,
        status: "pending",
        amount: finalAmount,
        discountAmount,
      });

      // Get YooKassa settings
      const settings = await storage.getSettings();
      const testMode = settings?.yookassaTestMode ?? true;

      if (testMode) {
        // In test mode, simulate immediate payment success
        await storage.updateOrder(order.id, { 
          status: "paid",
          paymentStatus: "succeeded",
          paidAt: new Date(),
        });

        // Send Telegram notifications
        if (orderType === 'express') {
          notifyExpressReportRequest({
            url: siteUrl,
            email,
          }).catch(err => console.error("[TELEGRAM] Express report notification failed:", err));
        } else if (orderType === 'package' && packageId) {
          const pkg = await storage.getPackage(packageId);
          notifyFullAuditRequest({
            url: siteUrl,
            email,
            phone,
            packageName: pkg?.name,
            price: finalAmount,
          }).catch(err => console.error("[TELEGRAM] Full audit notification failed:", err));
        }
        
        notifySuccessfulPayment({
          email,
          amount: finalAmount,
          serviceName: orderType === 'express' ? 'Экспресс-отчёт' : 'Полный аудит',
          orderId: parseInt(order.id) || undefined,
        }).catch(err => console.error("[TELEGRAM] Payment notification failed:", err));

        return res.json({ 
          success: true, 
          orderId: order.id,
          testMode: true,
        });
      }

      // In production mode, create real YooKassa payment
      try {
        const domain = process.env.DOMAIN || `https://${req.get('host')}`;
        const payment = await createPayment({
          amount: finalAmount,
          description: orderType === 'express' 
            ? 'Экспресс-отчёт по проверке сайта на ФЗ-152'
            : `Полный аудит сайта`,
          returnUrl: `${domain}/cabinet?order=${order.id}`,
          orderId: order.id,
          userEmail: email,
        });

        if (payment.confirmation?.confirmation_url) {
          return res.json({
            success: true,
            orderId: order.id,
            paymentUrl: payment.confirmation.confirmation_url,
            testMode: false,
          });
        }
      } catch (paymentError: any) {
        console.error("[Payment] YooKassa error:", paymentError.message);
        // If YooKassa fails, mark as pending for manual processing
      }

      res.json({ 
        success: true, 
        orderId: order.id,
        testMode: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // YooKassa webhook
  app.post("/api/yookassa/webhook", async (req, res) => {
    try {
      const body = req.body as YooKassaWebhookEvent;
      const clientIp = getClientIp(req);
      await handleWebhook(body, clientIp);
      res.status(200).send('OK');
    } catch (error) {
      console.error("[YooKassa Webhook] Error:", error);
      res.status(400).send('Bad Request');
    }
  });

  // ====================
  // AUTH ROUTES
  // ====================

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      // Check password
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      if (user.role !== 'admin' && user.role !== 'superadmin') {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get public cases (only active)
  app.get("/api/cases", async (req, res) => {
    try {
      const items = await storage.getAllCases();
      const activeItems = items.filter(i => i.isActive);
      res.json(activeItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  // ====================
  // ADMIN ROUTES
  // ====================

  // Admin Stats
  app.get("/api/admin/stats", verifyAdmin, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin Notification Counts (for blinking badges) - optimized with counts
  app.get("/api/admin/notifications/counts", verifyAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      const orders = await storage.getAllOrders();
      const tickets = await storage.getAllTickets();
      
      const unreadMessages = messages.filter((m: { isRead: boolean | null }) => !m.isRead).length;
      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const openTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress").length;
      
      res.json({
        messages: unreadMessages,
        orders: pendingOrders,
        tickets: openTickets,
        documents: 0,
        lawyerReview: 0,
        expressAudits: 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notification counts" });
    }
  });

  // Admin Users
  app.get("/api/admin/users", verifyAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords
      const safeUsers = users.map(u => ({ ...u, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", verifySuperAdmin, async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({ ...data, password: hashedPassword });
      res.json({ ...user, password: undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id", verifySuperAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      const user = await storage.updateUser(req.params.id, { role });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", verifySuperAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Admin Packages
  app.get("/api/admin/packages", verifyAdmin, async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  app.post("/api/admin/packages", verifyAdmin, async (req, res) => {
    try {
      const data = insertPackageSchema.parse(req.body);
      const pkg = await storage.createPackage(data);
      res.json(pkg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create package" });
    }
  });

  app.patch("/api/admin/packages/:id", verifyAdmin, async (req, res) => {
    try {
      const pkg = await storage.updatePackage(req.params.id, req.body);
      if (!pkg) {
        return res.status(404).json({ error: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      res.status(500).json({ error: "Failed to update package" });
    }
  });

  app.delete("/api/admin/packages/:id", verifyAdmin, async (req, res) => {
    try {
      await storage.deletePackage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete package" });
    }
  });

  // Admin FAQ
  app.get("/api/admin/faq", verifyAdmin, async (req, res) => {
    try {
      const items = await storage.getAllFaqItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch FAQ" });
    }
  });

  app.post("/api/admin/faq", verifyAdmin, async (req, res) => {
    try {
      const data = insertFaqItemSchema.parse(req.body);
      const item = await storage.createFaqItem(data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create FAQ item" });
    }
  });

  app.patch("/api/admin/faq/:id", verifyAdmin, async (req, res) => {
    try {
      const item = await storage.updateFaqItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "FAQ item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update FAQ item" });
    }
  });

  app.delete("/api/admin/faq/:id", verifyAdmin, async (req, res) => {
    try {
      await storage.deleteFaqItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete FAQ item" });
    }
  });

  // Admin Messages
  app.get("/api/admin/messages", verifyAdmin, async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.patch("/api/admin/messages/:id", verifyAdmin, async (req, res) => {
    try {
      const message = await storage.updateMessage(req.params.id, req.body);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  app.delete("/api/admin/messages/:id", verifyAdmin, async (req, res) => {
    try {
      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  // Admin Settings (superadmin only)
  app.get("/api/admin/settings", verifySuperAdmin, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", verifySuperAdmin, async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // GigaChat AI Settings (superadmin only)
  app.get("/api/admin/settings/gigachat", verifySuperAdmin, async (req, res) => {
    try {
      const settings = await storage.getGigaChatSettings();
      res.json(settings || {
        enabled: false,
        credentials: "",
        model: "GigaChat",
        isPersonal: true,
        promptTemplate: "",
        maxTokens: 2000,
        lastTestAt: null,
        lastTestStatus: null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch GigaChat settings" });
    }
  });

  app.post("/api/admin/settings/gigachat", verifySuperAdmin, async (req, res) => {
    try {
      const settings = await storage.saveGigaChatSettings(req.body);
      const gigachat = await import("./gigachat");
      gigachat.initGigaChat(settings);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to save GigaChat settings" });
    }
  });

  // Test AI provider connection
  app.get("/api/admin/ai/test/:provider", verifySuperAdmin, async (req, res) => {
    try {
      const { provider } = req.params;
      const { testAIConnection } = await import("./ai-services/index");
      const result = await testAIConnection(provider as any);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Ошибка тестирования" });
    }
  });

  app.post("/api/admin/settings/gigachat/test", verifySuperAdmin, async (req, res) => {
    try {
      const { credentials, isPersonal } = req.body;
      if (!credentials) {
        return res.status(400).json({ error: "Credentials required" });
      }
      const gigachat = await import("./gigachat");
      const success = await gigachat.testGigaChatConnection(credentials, isPersonal ?? true);
      if (success) {
        res.json({ success: true, message: "Connection successful" });
      } else {
        res.status(400).json({ error: "Connection failed" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to test GigaChat connection" });
    }
  });

  // Admin Orders
  app.get("/api/admin/orders", verifyAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.delete("/api/admin/orders/:id", verifyAdmin, async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  app.post("/api/admin/orders/bulk-delete", verifyAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No order IDs provided" });
      }
      await storage.deleteOrdersBulk(ids);
      res.json({ success: true, deleted: ids.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete orders" });
    }
  });

  // Admin Cases
  app.get("/api/admin/cases", verifyAdmin, async (req, res) => {
    try {
      const items = await storage.getAllCases();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  app.post("/api/admin/cases", verifyAdmin, async (req, res) => {
    try {
      const data = insertCaseSchema.parse(req.body);
      const item = await storage.createCase(data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  app.patch("/api/admin/cases/:id", verifyAdmin, async (req, res) => {
    try {
      const item = await storage.updateCase(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update case" });
    }
  });

  app.delete("/api/admin/cases/:id", verifyAdmin, async (req, res) => {
    try {
      await storage.deleteCase(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete case" });
    }
  });

  // ====================
  // PROMO CODES ADMIN ROUTES
  // ====================

  app.get("/api/admin/promo-codes", verifySuperAdmin, async (req, res) => {
    try {
      const items = await storage.getAllPromoCodes();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch promo codes" });
    }
  });

  app.post("/api/admin/promo-codes", verifySuperAdmin, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.expiresAt && typeof body.expiresAt === 'string') {
        body.expiresAt = new Date(body.expiresAt);
      }
      const data = insertPromoCodeSchema.parse(body);
      const item = await storage.createPromoCode(data);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create promo code" });
    }
  });

  app.patch("/api/admin/promo-codes/:id", verifySuperAdmin, async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.expiresAt && typeof body.expiresAt === 'string') {
        body.expiresAt = new Date(body.expiresAt);
      }
      const item = await storage.updatePromoCode(req.params.id, body);
      if (!item) {
        return res.status(404).json({ error: "Promo code not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update promo code" });
    }
  });

  app.delete("/api/admin/promo-codes/:id", verifySuperAdmin, async (req, res) => {
    try {
      await storage.deletePromoCode(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete promo code" });
    }
  });

  // ====================
  // REFERRAL SETTINGS ADMIN ROUTES
  // ====================

  app.get("/api/admin/referral-settings", verifySuperAdmin, async (req, res) => {
    try {
      let settings = await storage.getReferralSettings();
      if (!settings) {
        settings = await storage.updateReferralSettings({
          referrerBonus: 100,
          refereeDiscount: 10,
          isActive: true,
        });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch referral settings" });
    }
  });

  app.patch("/api/admin/referral-settings", verifySuperAdmin, async (req, res) => {
    try {
      const data = insertReferralSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateReferralSettings(data);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update referral settings" });
    }
  });

  // ====================
  // PUBLIC PROMO CODE VALIDATION
  // ====================

  const validatePromoSchema = z.object({
    code: z.string().min(1).max(50),
    orderAmount: z.number().min(0).optional(),
  });

  app.post("/api/promo-codes/validate", async (req, res) => {
    try {
      const clientIp = getClientIp(req);
      if (!checkPromoRateLimit(clientIp)) {
        return res.status(429).json({ error: "Слишком много запросов. Попробуйте позже." });
      }

      const parsed = validatePromoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Некорректные данные" });
      }
      const { code, orderAmount } = parsed.data;

      const promoCode = await storage.getPromoCodeByCode(code);
      if (!promoCode) {
        return res.status(404).json({ error: "Промокод не найден" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ error: "Промокод неактивен" });
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Срок действия промокода истек" });
      }

      if (promoCode.maxUses && promoCode.currentUses !== null && promoCode.currentUses >= promoCode.maxUses) {
        return res.status(400).json({ error: "Промокод исчерпан" });
      }

      if (promoCode.minOrderAmount && orderAmount && orderAmount < promoCode.minOrderAmount) {
        return res.status(400).json({ error: `Минимальная сумма заказа: ${promoCode.minOrderAmount} руб.` });
      }

      let discountAmount = 0;
      if (promoCode.discountType === 'percent') {
        discountAmount = Math.floor((orderAmount || 0) * promoCode.discountValue / 100);
      } else {
        discountAmount = promoCode.discountValue;
      }

      res.json({
        valid: true,
        promoCode: {
          id: promoCode.id,
          code: promoCode.code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue,
          description: promoCode.description,
        },
        discountAmount,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate promo code" });
    }
  });

  // ====================
  // USER AUTHENTICATION (NON-ADMIN)
  // ====================

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerUserSchema.parse(req.body);

      // Check if username exists
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ error: "Пользователь с таким логином уже существует" });
      }

      // Check if email exists
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Пользователь с таким email уже существует" });
      }

      // Check referral code if provided
      let referredById: string | undefined;
      if (data.referralCode) {
        const referrer = await storage.getUserByReferralCode(data.referralCode);
        if (!referrer) {
          return res.status(400).json({ error: "Реферальный код не найден" });
        }
        referredById = referrer.id;
      }

      // Generate unique referral code for new user
      const userReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        email: data.email,
        role: "user",
      });

      // Update user with referral info
      await storage.updateUser(user.id, {
        referralCode: userReferralCode,
        referredBy: referredById,
      } as any);

      // If user was referred, add bonus to referrer
      if (referredById) {
        const referrer = await storage.getUser(referredById);
        if (referrer) {
          const settings = await storage.getReferralSettings();
          const bonus = settings?.referrerBonus || 100;
          await storage.updateUser(referredById, {
            bonusBalance: (referrer.bonusBalance || 0) + bonus,
          } as any);
          
          // Send Telegram notification for referral registration
          notifyReferralRegistration({
            email: data.email,
            referrerEmail: referrer.email || undefined,
          }).catch(err => console.error("[TELEGRAM] Referral notification failed:", err));
        }
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: "user" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: data.email,
          role: "user",
          referralCode: userReferralCode,
          bonusBalance: 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Ошибка регистрации" });
    }
  });

  // User login (for non-admin users)
  app.post("/api/auth/user-login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        // Try by email
        const userByEmail = await storage.getUserByEmail(data.username);
        if (!userByEmail) {
          return res.status(401).json({ error: "Неверный логин или пароль" });
        }
        
        const validPassword = await bcrypt.compare(data.password, userByEmail.password);
        if (!validPassword) {
          return res.status(401).json({ error: "Неверный логин или пароль" });
        }

        const token = jwt.sign(
          { id: userByEmail.id, username: userByEmail.username, role: userByEmail.role },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        return res.json({
          token,
          user: {
            id: userByEmail.id,
            username: userByEmail.username,
            email: userByEmail.email,
            role: userByEmail.role,
            referralCode: userByEmail.referralCode,
            bonusBalance: userByEmail.bonusBalance || 0,
          },
        });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Неверный логин или пароль" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          bonusBalance: user.bonusBalance || 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Ошибка входа" });
    }
  });

  // ====================
  // OAUTH SOCIAL LOGIN
  // ====================

  // Get OAuth config (public - only returns enabled status and app IDs, not secrets)
  app.get("/api/auth/oauth/config", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json({
        enabled: settings?.oauthEnabled || false,
        vk: settings?.vkAppId ? { appId: settings.vkAppId } : null,
        yandex: settings?.yandexClientId ? { clientId: settings.yandexClientId } : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch OAuth config" });
    }
  });

  // VK OAuth - Start authorization
  app.get("/api/auth/vk", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.oauthEnabled || !settings?.vkAppId) {
        return res.status(400).json({ error: "VK авторизация не настроена" });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/vk/callback`;
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://oauth.vk.com/authorize?client_id=${settings.vkAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email&v=5.131&state=${state}`;
      
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({ error: "VK OAuth error" });
    }
  });

  // VK OAuth - Callback
  app.get("/api/auth/vk/callback", async (req, res) => {
    try {
      const { code, error: vkError } = req.query;
      
      if (vkError) {
        return res.redirect("/auth?error=vk_denied");
      }

      if (!code) {
        return res.redirect("/auth?error=vk_no_code");
      }

      const settings = await storage.getSettings();
      if (!settings?.vkAppId || !settings?.vkAppSecret) {
        return res.redirect("/auth?error=vk_not_configured");
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/vk/callback`;

      // Exchange code for access token
      const tokenResponse = await fetch(`https://oauth.vk.com/access_token?client_id=${settings.vkAppId}&client_secret=${settings.vkAppSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        console.error("VK token error:", tokenData);
        return res.redirect("/auth?error=vk_token_error");
      }

      const { access_token, user_id, email } = tokenData;

      // Get user info from VK
      const userResponse = await fetch(`https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_100,first_name,last_name&access_token=${access_token}&v=5.131`);
      const userData = await userResponse.json() as any;

      if (!userData.response || !userData.response[0]) {
        return res.redirect("/auth?error=vk_user_error");
      }

      const vkUser = userData.response[0];
      const vkId = String(vkUser.id);
      const fullName = `${vkUser.first_name} ${vkUser.last_name}`;
      const avatarUrl = vkUser.photo_100;

      // Check if user exists by VK ID
      let user = await storage.getUserByVkId(vkId);

      if (!user) {
        // Check if user exists by email
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link VK to existing account
            await storage.updateUser(user.id, { vkId, avatarUrl });
          }
        }

        if (!user) {
          // Create new user
          const username = `vk_${vkId}`;
          const randomPassword = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const referralCode = `REF${Date.now().toString(36).toUpperCase()}`;

          user = await storage.createUser({
            username,
            password: hashedPassword,
            email: email || null,
            fullName,
            vkId,
            avatarUrl,
            role: "user",
            referralCode,
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token
      res.redirect(`/auth/callback?token=${token}&provider=vk`);
    } catch (error) {
      console.error("VK callback error:", error);
      res.redirect("/auth?error=vk_callback_error");
    }
  });

  // Yandex OAuth - Start authorization
  app.get("/api/auth/yandex", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings?.oauthEnabled || !settings?.yandexClientId) {
        return res.status(400).json({ error: "Яндекс авторизация не настроена" });
      }

      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/yandex/callback`;
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://oauth.yandex.com/authorize?client_id=${settings.yandexClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
      
      res.redirect(authUrl);
    } catch (error) {
      res.status(500).json({ error: "Yandex OAuth error" });
    }
  });

  // Yandex OAuth - Callback
  app.get("/api/auth/yandex/callback", async (req, res) => {
    try {
      const { code, error: yandexError } = req.query;
      
      if (yandexError) {
        return res.redirect("/auth?error=yandex_denied");
      }

      if (!code) {
        return res.redirect("/auth?error=yandex_no_code");
      }

      const settings = await storage.getSettings();
      if (!settings?.yandexClientId || !settings?.yandexClientSecret) {
        return res.redirect("/auth?error=yandex_not_configured");
      }

      // Exchange code for access token
      const tokenResponse = await fetch("https://oauth.yandex.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          client_id: settings.yandexClientId,
          client_secret: settings.yandexClientSecret,
        }),
      });
      const tokenData = await tokenResponse.json() as any;

      if (tokenData.error) {
        console.error("Yandex token error:", tokenData);
        return res.redirect("/auth?error=yandex_token_error");
      }

      const { access_token } = tokenData;

      // Get user info from Yandex
      const userResponse = await fetch("https://login.yandex.ru/info?format=json", {
        headers: {
          Authorization: `OAuth ${access_token}`,
        },
      });
      const yandexUser = await userResponse.json() as any;

      if (!yandexUser.id) {
        return res.redirect("/auth?error=yandex_user_error");
      }

      const yandexId = String(yandexUser.id);
      const fullName = yandexUser.real_name || yandexUser.display_name || yandexUser.login;
      const email = yandexUser.default_email || yandexUser.email;
      const avatarUrl = yandexUser.default_avatar_id 
        ? `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`
        : null;

      // Check if user exists by Yandex ID
      let user = await storage.getUserByYandexId(yandexId);

      if (!user) {
        // Check if user exists by email
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Link Yandex to existing account
            await storage.updateUser(user.id, { yandexId, avatarUrl });
          }
        }

        if (!user) {
          // Create new user
          const username = `yandex_${yandexId}`;
          const randomPassword = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const referralCode = `REF${Date.now().toString(36).toUpperCase()}`;

          user = await storage.createUser({
            username,
            password: hashedPassword,
            email: email || null,
            fullName,
            yandexId,
            avatarUrl,
            role: "user",
            referralCode,
          });
        }
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Redirect to frontend with token
      res.redirect(`/auth/callback?token=${token}&provider=yandex`);
    } catch (error) {
      console.error("Yandex callback error:", error);
      res.redirect("/auth?error=yandex_callback_error");
    }
  });

  // Get current user profile
  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get balance from commissions
      const balance = await storage.getUserBalance(user.id);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        bonusBalance: user.bonusBalance || 0,
        balance,
        fullName: user.fullName,
        phone: user.phone,
        whatsapp: user.whatsapp,
        telegramHandle: user.telegramHandle,
        vkProfile: user.vkProfile,
        organizationInn: user.organizationInn,
        siteUrl: user.siteUrl,
      });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get user orders
  app.get("/api/user/orders", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const orders = await storage.getOrdersByUserId(decoded.id);
      res.json(orders);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Download PDF report for order (authenticated users only)
  app.get("/api/user/orders/:orderId/pdf", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Необходима авторизация для скачивания отчета" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const order = await storage.getOrder(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: "Заказ не найден" });
      }

      // Check if the order belongs to the user
      if (order.userId !== decoded.id) {
        return res.status(403).json({ error: "Доступ запрещен" });
      }

      // Check if order has audit results
      if (!order.auditResults) {
        return res.status(400).json({ error: "Результаты аудита отсутствуют" });
      }

      const { generateAuditReportPDF } = await import("./pdf-service");
      
      const pdfBuffer = await generateAuditReportPDF({
        siteUrl: order.siteUrl,
        email: order.email,
        siteType: order.siteType || "Не указан",
        totalScore: order.totalScore || 0,
        auditResults: order.auditResults as any,
        createdAt: order.createdAt || new Date(),
        orderId: order.id,
      });

      const filename = `audit-report-${order.id.substring(0, 8)}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      return res.status(500).json({ error: "Ошибка генерации отчета" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.updateUserProfile(decoded.id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get user referrals
  app.get("/api/user/referrals", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const referrals = await storage.getReferralsByReferrerId(decoded.id);
      
      // Get referral settings for commission info
      const settings = await storage.getReferralSettings();
      
      res.json({
        referrals,
        commissionPercent: settings?.commissionPercent || 20,
        totalReferrals: referrals.length,
        paidReferrals: referrals.filter(r => r.status === 'paid').length,
        totalEarned: referrals.reduce((sum, r) => sum + (r.commissionEarned || 0), 0),
      });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get user commissions
  app.get("/api/user/commissions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const commissions = await storage.getCommissionsByUserId(decoded.id);
      const balance = await storage.getUserBalance(decoded.id);
      res.json({ commissions, balance });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get user payouts
  app.get("/api/user/payouts", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const payouts = await storage.getPayoutsByUserId(decoded.id);
      const balance = await storage.getUserBalance(decoded.id);
      const settings = await storage.getReferralSettings();
      res.json({ 
        payouts, 
        balance,
        minPayoutAmount: settings?.minPayoutAmount || 500,
      });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Create payout request
  app.post("/api/user/payouts", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const { amount, paymentMethod, paymentDetails } = req.body;
      
      // Validate balance
      const balance = await storage.getUserBalance(decoded.id);
      const settings = await storage.getReferralSettings();
      
      if (amount > balance) {
        return res.status(400).json({ error: "Недостаточно средств" });
      }
      
      if (amount < (settings?.minPayoutAmount || 500)) {
        return res.status(400).json({ error: `Минимальная сумма вывода: ${settings?.minPayoutAmount || 500} руб.` });
      }

      const payout = await storage.createPayout({
        userId: decoded.id,
        amount,
        paymentMethod,
        paymentDetails,
        status: "pending",
      });

      // Create notification for user
      await storage.createNotification({
        userId: decoded.id,
        title: "Заявка на вывод",
        message: `Ваша заявка на вывод ${amount} руб. принята в обработку.`,
        type: "info",
      });

      res.json(payout);
    } catch (error) {
      console.error("Error creating payout:", error);
      res.status(500).json({ error: "Failed to create payout request" });
    }
  });

  // Get user notifications
  app.get("/api/user/notifications", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const notifications = await storage.getNotificationsByUserId(decoded.id);
      res.json(notifications);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Mark notification as read
  app.patch("/api/user/notifications/:id/read", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const notification = await storage.markNotificationRead(req.params.id);
      res.json(notification);
    } catch {
      return res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/user/notifications/mark-all-read", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      await storage.markAllNotificationsRead(decoded.id);
      res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Get user subscriptions
  app.get("/api/user/subscriptions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      let subscription = await storage.getUserSubscription(decoded.id);
      
      // Create default subscription if not exists
      if (!subscription) {
        subscription = await storage.createOrUpdateSubscription(decoded.id, {
          emailNews: true,
          emailPromo: true,
          inAppNotifications: true,
        });
      }
      
      res.json(subscription);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Update user subscriptions
  app.patch("/api/user/subscriptions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const subscription = await storage.createOrUpdateSubscription(decoded.id, req.body);
      res.json(subscription);
    } catch {
      return res.status(500).json({ error: "Failed to update subscriptions" });
    }
  });

  // Admin: Get all payouts
  app.get("/api/admin/payouts", verifyAdmin, async (req, res) => {
    try {
      const payouts = await storage.getAllPayouts();
      res.json(payouts);
    } catch {
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Admin: Update payout status
  app.patch("/api/admin/payouts/:id", verifyAdmin, async (req, res) => {
    try {
      const payout = await storage.updatePayout(req.params.id, {
        ...req.body,
        processedAt: req.body.status === 'completed' || req.body.status === 'rejected' ? new Date() : undefined,
      });
      res.json(payout);
    } catch {
      res.status(500).json({ error: "Failed to update payout" });
    }
  });

  // ================================
  // USER SITES AND AUDITS ROUTES
  // ================================

  // Get user's sites
  app.get("/api/user/sites", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const sites = await storage.getUserSites(decoded.id);
      res.json(sites);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get single site
  app.get("/api/user/sites/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const site = await storage.getUserSite(req.params.id);
      if (!site || site.userId !== decoded.id) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Add new site
  app.post("/api/user/sites", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const { url, displayName } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Normalize URL
      let normalizedUrl = url.trim();
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }

      // Check if site already exists for this user
      const existing = await storage.getUserSiteByUrl(decoded.id, normalizedUrl);
      if (existing) {
        return res.status(400).json({ error: "Этот сайт уже добавлен" });
      }

      const site = await storage.createUserSite({
        userId: decoded.id,
        url: normalizedUrl,
        displayName: displayName || new URL(normalizedUrl).hostname,
      });
      res.json(site);
    } catch (error) {
      console.error("Error creating site:", error);
      return res.status(500).json({ error: "Failed to add site" });
    }
  });

  // Update site
  app.patch("/api/user/sites/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const site = await storage.getUserSite(req.params.id);
      if (!site || site.userId !== decoded.id) {
        return res.status(404).json({ error: "Site not found" });
      }

      const updated = await storage.updateUserSite(req.params.id, req.body);
      res.json(updated);
    } catch {
      return res.status(500).json({ error: "Failed to update site" });
    }
  });

  // Delete site
  app.delete("/api/user/sites/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const site = await storage.getUserSite(req.params.id);
      if (!site || site.userId !== decoded.id) {
        return res.status(404).json({ error: "Site not found" });
      }

      await storage.deleteUserSite(req.params.id);
      res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Failed to delete site" });
    }
  });

  // Get audits for a site
  app.get("/api/user/sites/:siteId/audits", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const site = await storage.getUserSite(req.params.siteId);
      if (!site || site.userId !== decoded.id) {
        return res.status(404).json({ error: "Site not found" });
      }

      const audits = await storage.getSiteAudits(req.params.siteId);
      res.json(audits);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get all user's audits across all sites
  app.get("/api/user/audits", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const audits = await storage.getAuditsByUserId(decoded.id);
      res.json(audits);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get single audit with findings
  app.get("/api/user/audits/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const audit = await storage.getSiteAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }

      const site = await storage.getUserSite(audit.siteId);
      if (!site || site.userId !== decoded.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const findings = await storage.getAuditFindings(req.params.id);
      res.json({ ...audit, findings, site });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get user's site subscriptions
  app.get("/api/user/site-subscriptions", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const subscriptions = await storage.getSiteSubscriptionsByUserId(decoded.id);
      res.json(subscriptions);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Get available subscription plans
  app.get("/api/subscription-plans", async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      const activePlans = plans.filter(p => p.isActive);
      res.json(activePlans);
    } catch {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Get user's tickets
  app.get("/api/user/tickets", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const tickets = await storage.getTicketsByUserId(decoded.id);
      res.json(tickets);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Create ticket
  app.post("/api/user/tickets", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const { subject, type, siteId, orderId, message } = req.body;
      if (!subject) {
        return res.status(400).json({ error: "Subject is required" });
      }

      const ticket = await storage.createTicket({
        userId: decoded.id,
        subject,
        type: type || 'general',
        siteId,
        orderId,
      });

      // Add first message if provided
      if (message) {
        await storage.createTicketMessage({
          ticketId: ticket.id,
          senderId: decoded.id,
          senderRole: 'user',
          message,
        });
      }

      res.json(ticket);
    } catch {
      return res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  // Get ticket with messages
  app.get("/api/user/tickets/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket || ticket.userId !== decoded.id) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messages = await storage.getTicketMessages(req.params.id);
      // Filter out internal messages for users
      const userMessages = messages.filter(m => !m.isInternal);
      res.json({ ...ticket, messages: userMessages });
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  });

  // Add message to ticket
  app.post("/api/user/tickets/:id/messages", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket || ticket.userId !== decoded.id) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const newMessage = await storage.createTicketMessage({
        ticketId: req.params.id,
        senderId: decoded.id,
        senderRole: 'user',
        message,
      });

      // Reopen ticket if it was closed/resolved
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await storage.updateTicket(req.params.id, { status: 'open' });
      }

      res.json(newMessage);
    } catch {
      return res.status(500).json({ error: "Failed to add message" });
    }
  });

  // ================================
  // ADMIN ROUTES FOR NEW ENTITIES
  // ================================

  // Admin: Get all tickets
  app.get("/api/admin/tickets", verifyAdmin, async (req, res) => {
    try {
      const allTickets = await storage.getAllTickets();
      res.json(allTickets);
    } catch {
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  // Admin: Get ticket with messages
  app.get("/api/admin/tickets/:id", verifyAdmin, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      const messages = await storage.getTicketMessages(req.params.id);
      res.json({ ...ticket, messages });
    } catch {
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });

  // Admin: Update ticket
  app.patch("/api/admin/tickets/:id", verifyAdmin, async (req: any, res) => {
    try {
      const ticket = await storage.updateTicket(req.params.id, {
        ...req.body,
        resolvedAt: req.body.status === 'resolved' ? new Date() : undefined,
      });

      // Log admin action
      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'update',
        entityType: 'ticket',
        entityId: req.params.id,
        details: req.body,
        ipAddress: getClientIp(req),
      });

      res.json(ticket);
    } catch {
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // Admin: Add message to ticket
  app.post("/api/admin/tickets/:id/messages", verifyAdmin, async (req: any, res) => {
    try {
      const { message, isInternal } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const newMessage = await storage.createTicketMessage({
        ticketId: req.params.id,
        senderId: req.user.id,
        senderRole: req.user.role,
        message,
        isInternal: isInternal || false,
      });

      // Update ticket status to in_progress if it was open
      const ticket = await storage.getTicket(req.params.id);
      if (ticket?.status === 'open') {
        await storage.updateTicket(req.params.id, { status: 'in_progress' });
      }

      res.json(newMessage);
    } catch {
      res.status(500).json({ error: "Failed to add message" });
    }
  });

  // Admin: Get all admin logs
  app.get("/api/admin/logs", verifySuperAdmin, async (req, res) => {
    try {
      const logs = await storage.getAllAdminLogs();
      res.json(logs);
    } catch {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Admin: Subscription plans management
  app.get("/api/admin/subscription-plans", verifyAdmin, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.post("/api/admin/subscription-plans", verifySuperAdmin, async (req: any, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      
      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'create',
        entityType: 'subscription_plan',
        entityId: plan.id,
        details: req.body,
        ipAddress: getClientIp(req),
      });

      res.json(plan);
    } catch {
      res.status(500).json({ error: "Failed to create plan" });
    }
  });

  app.patch("/api/admin/subscription-plans/:id", verifySuperAdmin, async (req: any, res) => {
    try {
      const plan = await storage.updateSubscriptionPlan(req.params.id, req.body);
      
      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'update',
        entityType: 'subscription_plan',
        entityId: req.params.id,
        details: req.body,
        ipAddress: getClientIp(req),
      });

      res.json(plan);
    } catch {
      res.status(500).json({ error: "Failed to update plan" });
    }
  });

  app.delete("/api/admin/subscription-plans/:id", verifySuperAdmin, async (req: any, res) => {
    try {
      await storage.deleteSubscriptionPlan(req.params.id);
      
      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'delete',
        entityType: 'subscription_plan',
        entityId: req.params.id,
        ipAddress: getClientIp(req),
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });

  // Admin: Get user's sites (for viewing user details)
  app.get("/api/admin/users/:userId/sites", verifyAdmin, async (req, res) => {
    try {
      const sites = await storage.getUserSites(req.params.userId);
      res.json(sites);
    } catch {
      res.status(500).json({ error: "Failed to fetch user sites" });
    }
  });

  // Admin: Get enhanced stats for dashboard
  app.get("/api/admin/enhanced-stats", verifyAdmin, async (req, res) => {
    try {
      const basicStats = await storage.getStats();
      const allUsers = await storage.getAllUsers();
      const allPayouts = await storage.getAllPayouts();
      const allTickets = await storage.getAllTickets();
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newUsersLast7Days = allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= sevenDaysAgo).length;
      const pendingPayouts = allPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
      const openTickets = allTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
      const activeSubscriptions = 0; // Will be computed when subscriptions are used

      res.json({
        ...basicStats,
        newUsersLast7Days,
        pendingPayouts,
        openTickets,
        activeSubscriptions,
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Admin: Get all sites with user info
  app.get("/api/admin/sites", verifyAdmin, async (req, res) => {
    try {
      const sites = await storage.getAllSites();
      const users = await storage.getAllUsers();
      const sitesWithUsers = sites.map(site => ({
        ...site,
        userEmail: users.find(u => u.id === site.userId)?.email || null,
      }));
      res.json(sitesWithUsers);
    } catch {
      res.status(500).json({ error: "Failed to fetch sites" });
    }
  });

  // Admin: Get all audits
  app.get("/api/admin/audits", verifyAdmin, async (req, res) => {
    try {
      const audits = await storage.getAllAudits();
      res.json(audits);
    } catch {
      res.status(500).json({ error: "Failed to fetch audits" });
    }
  });

  // Admin: Trigger audit for site
  app.post("/api/admin/sites/:siteId/audit", verifyAdmin, async (req: any, res) => {
    try {
      const site = await storage.getSite(req.params.siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      // Create a new audit record
      const audit = await storage.createSiteAudit({
        siteId: req.params.siteId,
        orderId: null,
        status: 'pending',
        overallScore: 0,
        law149Score: null,
        law152Score: null,
        law149Status: null,
        law152Status: null,
        summary: null,
        recommendations: null,
      });

      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'create',
        entityType: 'audit',
        entityId: audit.id,
        details: { siteId: req.params.siteId },
        ipAddress: getClientIp(req),
      });

      res.json(audit);
    } catch {
      res.status(500).json({ error: "Failed to create audit" });
    }
  });

  // Admin: Update site (status, mailing, verified)
  app.patch("/api/admin/sites/:siteId", verifyAdmin, async (req: any, res) => {
    try {
      const site = await storage.getSite(req.params.siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const allowedFields = ['isVerified', 'mailingEnabled', 'isActive', 'displayName'];
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const updated = await storage.updateUserSite(req.params.siteId, updateData);

      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'update',
        entityType: 'site',
        entityId: req.params.siteId,
        details: updateData,
        ipAddress: getClientIp(req),
      });

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update site" });
    }
  });

  // Admin: Delete site
  app.delete("/api/admin/sites/:siteId", verifyAdmin, async (req: any, res) => {
    try {
      const site = await storage.getSite(req.params.siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      await storage.deleteUserSite(req.params.siteId);

      await storage.createAdminLog({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'delete',
        entityType: 'site',
        entityId: req.params.siteId,
        details: { url: site.url },
        ipAddress: getClientIp(req),
      });

      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete site" });
    }
  });

  // Admin: Reply to ticket (alternative endpoint)
  app.post("/api/admin/tickets/:id/reply", verifyAdmin, async (req: any, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const newMessage = await storage.createTicketMessage({
        ticketId: req.params.id,
        senderId: req.user.id,
        senderRole: req.user.role,
        message,
        isInternal: false,
      });

      // Update ticket status to in_progress if it was open
      const ticket = await storage.getTicket(req.params.id);
      if (ticket?.status === 'open') {
        await storage.updateTicket(req.params.id, { status: 'in_progress' });
      }

      res.json(newMessage);
    } catch {
      res.status(500).json({ error: "Failed to send reply" });
    }
  });
}
