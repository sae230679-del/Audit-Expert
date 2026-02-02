import type { Express, Request, Response, NextFunction } from "express";
import { db } from "./db";
import { documents, documentReviews } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

function requireAuth(req: any, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Требуется авторизация" });
  }
  next();
}

function requireManager(req: any, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user as any;
    if (!["manager", "admin", "superadmin"].includes(user?.role)) {
      return res.status(403).json({ error: "Доступ только для менеджеров" });
    }
    next();
  });
}

function requireLawyer(req: any, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = req.user as any;
    if (!["lawyer", "admin", "superadmin"].includes(user?.role)) {
      return res.status(403).json({ error: "Доступ только для юристов" });
    }
    next();
  });
}

export function registerDocumentRoutes(app: Express) {
  
  app.get("/api/manager/documents", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.query;
      
      let query = db.select().from(documents);
      
      if (status && typeof status === "string") {
        query = query.where(eq(documents.status, status as any)) as any;
      }
      
      if (user.role === "manager") {
        query = query.where(eq(documents.assignedManagerId, user.id)) as any;
      }
      
      const result = await query.orderBy(desc(documents.createdAt));
      res.json(result);
    } catch (error: any) {
      console.error("[MANAGER] Get documents error:", error?.message);
      res.status(500).json({ error: "Ошибка получения документов" });
    }
  });

  app.get("/api/manager/documents/stats", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      
      let allDocs;
      if (user.role === "manager") {
        allDocs = await db.select().from(documents)
          .where(eq(documents.assignedManagerId, user.id));
      } else {
        allDocs = await db.select().from(documents);
      }
      
      const stats = {
        total: allDocs.length,
        draft: allDocs.filter(d => d.status === "draft").length,
        inReview: allDocs.filter(d => d.status === "pending_review").length,
        revision: allDocs.filter(d => d.status === "revision").length,
        approved: allDocs.filter(d => d.status === "approved").length,
        delivered: allDocs.filter(d => d.status === "delivered").length,
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("[MANAGER] Get stats error:", error?.message);
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  });

  app.post("/api/manager/documents", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      const { 
        title, 
        documentType,
        clientCompanyName,
        clientCompanyType,
        clientInn,
        clientOgrn,
        clientKpp,
        clientAddress,
        clientDirectorName,
        clientDirectorPosition,
        clientPhone,
        clientEmail,
        content,
        managerNotes
      } = req.body;
      
      if (!title || !documentType) {
        return res.status(400).json({ error: "Название и тип документа обязательны" });
      }
      
      const [document] = await db.insert(documents).values({
        title,
        documentType,
        status: "draft",
        createdByUserId: user.id,
        assignedManagerId: user.id,
        clientCompanyName: clientCompanyName || null,
        clientCompanyType: clientCompanyType || null,
        clientInn: clientInn || null,
        clientOgrn: clientOgrn || null,
        clientKpp: clientKpp || null,
        clientAddress: clientAddress || null,
        clientDirectorName: clientDirectorName || null,
        clientDirectorPosition: clientDirectorPosition || null,
        clientPhone: clientPhone || null,
        clientEmail: clientEmail || null,
        content: content || null,
        managerNotes: managerNotes || null,
      }).returning();
      
      res.json(document);
    } catch (error: any) {
      console.error("[MANAGER] Create document error:", error?.message);
      res.status(500).json({ error: "Ошибка создания документа" });
    }
  });

  app.patch("/api/manager/documents/:id", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { title, documentType } = req.body;
      
      const [document] = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      const [updated] = await db.update(documents)
        .set({ title, documentType, updatedAt: new Date() })
        .where(eq(documents.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Update document error:", error?.message);
      res.status(500).json({ error: "Ошибка обновления документа" });
    }
  });

  app.post("/api/manager/documents/:id/send-to-review", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const [document] = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      if (document.status !== "draft" && document.status !== "revision") {
        return res.status(400).json({ error: "Документ уже отправлен на проверку" });
      }
      
      const [updated] = await db.update(documents)
        .set({ status: "pending_review", updatedAt: new Date() })
        .where(eq(documents.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Send to review error:", error?.message);
      res.status(500).json({ error: "Ошибка отправки на проверку" });
    }
  });

  app.post("/api/manager/documents/:id/deliver", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const [document] = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      if (document.status !== "approved") {
        return res.status(400).json({ error: "Только одобренные документы можно пометить как доставленные" });
      }
      
      const [updated] = await db.update(documents)
        .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
        .where(eq(documents.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Deliver document error:", error?.message);
      res.status(500).json({ error: "Ошибка доставки документа" });
    }
  });

  app.delete("/api/manager/documents/:id", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const [document] = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      await db.delete(documents).where(eq(documents.id, parseInt(id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[MANAGER] Delete document error:", error?.message);
      res.status(500).json({ error: "Ошибка удаления документа" });
    }
  });

  app.get("/api/lawyer/documents", requireLawyer, async (req, res) => {
    try {
      const user = req.user as any;
      
      const allDocs = await db.select().from(documents).orderBy(desc(documents.createdAt));
      
      const filteredDocs = allDocs.filter(d => 
        d.status === "pending_review" || 
        d.status === "approved" || 
        d.status === "delivered" ||
        d.assignedLawyerId === user.id
      );
      
      res.json(filteredDocs);
    } catch (error: any) {
      console.error("[LAWYER] Get documents error:", error?.message);
      res.status(500).json({ error: "Ошибка получения документов" });
    }
  });

  app.get("/api/lawyer/documents/stats", requireLawyer, async (req, res) => {
    try {
      const user = req.user as any;
      
      const allDocs = await db.select().from(documents);
      const accessibleDocs = allDocs.filter(d => 
        d.status === "pending_review" || 
        d.assignedLawyerId === user.id
      );
      
      const stats = {
        inReview: accessibleDocs.filter(d => d.status === "pending_review").length,
        approved: accessibleDocs.filter(d => d.status === "approved" && d.assignedLawyerId === user.id).length,
        revision: accessibleDocs.filter(d => d.status === "revision" && d.assignedLawyerId === user.id).length,
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("[LAWYER] Get stats error:", error?.message);
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  });

  app.post("/api/lawyer/documents/:id/review", requireLawyer, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { action, comment } = req.body;
      
      if (!action || !["approve", "request_revision"].includes(action)) {
        return res.status(400).json({ error: "Укажите действие: approve или request_revision" });
      }
      
      const [document] = await db.select().from(documents).where(eq(documents.id, parseInt(id)));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (document.status !== "pending_review") {
        return res.status(400).json({ error: "Документ не находится на проверке" });
      }
      
      await db.insert(documentReviews).values({
        documentId: parseInt(id),
        versionId: document.currentVersionId || 1,
        reviewerUserId: user.id,
        decision: action === "approve" ? "approved" : "revision_requested",
        comment: comment || null,
      });
      
      const newStatus = action === "approve" ? "approved" : "revision";
      const [updated] = await db.update(documents)
        .set({ status: newStatus, assignedLawyerId: user.id, updatedAt: new Date() })
        .where(eq(documents.id, parseInt(id)))
        .returning();
      
      res.json(updated);
    } catch (error: any) {
      console.error("[LAWYER] Review document error:", error?.message);
      res.status(500).json({ error: "Ошибка проверки документа" });
    }
  });

  app.get("/api/lawyer/documents/:id/reviews", requireLawyer, async (req, res) => {
    try {
      const { id } = req.params;
      
      const reviews = await db.select().from(documentReviews)
        .where(eq(documentReviews.documentId, parseInt(id)))
        .orderBy(desc(documentReviews.createdAt));
      
      res.json(reviews);
    } catch (error: any) {
      console.error("[LAWYER] Get reviews error:", error?.message);
      res.status(500).json({ error: "Ошибка получения истории проверок" });
    }
  });

  app.get("/api/lawyer/integrations", requireLawyer, async (_req, res) => {
    try {
      res.json({
        consultantPlus: false,
        garant: false,
      });
    } catch (error: any) {
      console.error("[LAWYER] Get integrations error:", error?.message);
      res.status(500).json({ error: "Ошибка получения интеграций" });
    }
  });
}
