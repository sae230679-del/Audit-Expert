  app.get("/api/manager/documents", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.query;
      
      const filters: { status?: string; managerId?: number } = {};
      if (status && typeof status === "string") {
        filters.status = status;
      }
      if (user.role === "manager") {
        filters.managerId = user.id;
      }
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error: any) {
      console.error("[MANAGER] Get documents error:", error?.message);
      res.status(500).json({ error: "Ошибка получения документов" });
    }
  });

  // Статистика менеджера
  app.get("/api/manager/documents/stats", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      const filters = user.role === "manager" ? { managerId: user.id } : {};
      
      const documents = await storage.getDocuments(filters);
      
      const stats = {
        total: documents.length,
        draft: documents.filter(d => d.status === "draft").length,
        inReview: documents.filter(d => d.status === "in_review").length,
        revision: documents.filter(d => d.status === "revision").length,
        approved: documents.filter(d => d.status === "approved").length,
        delivered: documents.filter(d => d.status === "delivered").length,
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("[MANAGER] Get stats error:", error?.message);
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  });

  // Создать документ
  app.post("/api/manager/documents", requireManager, async (req, res) => {
    try {
      const user = req.user as any;
      const { title, documentType, content, clientEmail, clientName, orderId, notes } = req.body;
      
      if (!title || !documentType) {
        return res.status(400).json({ error: "Название и тип документа обязательны" });
      }
      
      const document = await storage.createDocument({
        title,
        documentType,
        content: content || null,
        clientEmail: clientEmail || null,
        clientName: clientName || null,
        orderId: orderId || null,
        notes: notes || null,
        status: "draft",
        assignedManagerId: user.id,
      });
      
      res.json(document);
    } catch (error: any) {
      console.error("[MANAGER] Create document error:", error?.message);
      res.status(500).json({ error: "Ошибка создания документа" });
    }
  });

  // Обновить документ
  app.patch("/api/manager/documents/:id", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { title, documentType, content, clientEmail, clientName, notes } = req.body;
      
      const document = await storage.getDocumentById(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      const updated = await storage.updateDocument(parseInt(id), {
        title,
        documentType,
        content,
        clientEmail,
        clientName,
        notes,
        updatedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Update document error:", error?.message);
      res.status(500).json({ error: "Ошибка обновления документа" });
    }
  });

  // Отправить документ на проверку юристу
  app.post("/api/manager/documents/:id/send-to-review", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const document = await storage.getDocumentById(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      if (document.status !== "draft" && document.status !== "revision") {
        return res.status(400).json({ error: "Документ уже отправлен на проверку" });
      }
      
      const updated = await storage.updateDocument(parseInt(id), {
        status: "in_review",
        updatedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Send to review error:", error?.message);
      res.status(500).json({ error: "Ошибка отправки на проверку" });
    }
  });

  // Удалить документ
  app.delete("/api/manager/documents/:id", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const document = await storage.getDocumentById(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      await storage.deleteDocument(parseInt(id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[MANAGER] Delete document error:", error?.message);
      res.status(500).json({ error: "Ошибка удаления документа" });
    }
  });

  // =========================================
  // Document Management API - Юрист
  // =========================================

  // Получить документы для проверки юристом
  app.get("/api/lawyer/documents", requireLawyer, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.query;
      
      const filters: { status?: string; lawyerId?: number } = {};
      if (status && typeof status === "string") {
        filters.status = status;
      }
      
      const documents = await storage.getDocuments(filters);
      
      // Для юристов показываем только документы в статусах in_review, approved, delivered
      // или назначенные им
      const filteredDocs = documents.filter(d => 
        d.status === "in_review" || 
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

  // Статистика юриста
  app.get("/api/lawyer/documents/stats", requireLawyer, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Получаем только документы, доступные юристу:
      // - Документы на проверке (in_review) - все юристы видят
      // - Документы, назначенные этому юристу
      const allDocs = await storage.getDocuments();
      const accessibleDocs = allDocs.filter(d => 
        d.status === "in_review" || 
        d.assignedLawyerId === user.id
      );
      
      const stats = {
        pendingReview: accessibleDocs.filter(d => d.status === "in_review").length,
        approved: accessibleDocs.filter(d => d.status === "approved" && d.assignedLawyerId === user.id).length,
        revision: accessibleDocs.filter(d => d.status === "revision" && d.assignedLawyerId === user.id).length,
        myReviews: accessibleDocs.filter(d => d.assignedLawyerId === user.id).length,
      };
      
      res.json(stats);
    } catch (error: any) {
      console.error("[LAWYER] Get stats error:", error?.message);
      res.status(500).json({ error: "Ошибка получения статистики" });
    }
  });

  // Проверить документ (одобрить или вернуть на доработку)
  app.post("/api/lawyer/documents/:id/review", requireLawyer, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const { action, comment } = req.body;
      
      if (!action || !["approve", "request_revision"].includes(action)) {
        return res.status(400).json({ error: "Укажите действие: approve или request_revision" });
      }
      
      const document = await storage.getDocumentById(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (document.status !== "in_review") {
        return res.status(400).json({ error: "Документ не находится на проверке" });
      }
      
      // Создаём запись о проверке
      await storage.createDocumentReview({
        documentId: parseInt(id),
        reviewerId: user.id,
        decision: action === "approve" ? "approved" : "revision_requested",
        comment: comment || null,
      });
      
      // Обновляем статус документа
      const newStatus = action === "approve" ? "approved" : "revision";
      const updated = await storage.updateDocument(parseInt(id), {
        status: newStatus,
        assignedLawyerId: user.id,
        updatedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("[LAWYER] Review document error:", error?.message);
      res.status(500).json({ error: "Ошибка проверки документа" });
    }
  });

  // Получить историю проверок документа
  app.get("/api/lawyer/documents/:id/reviews", requireLawyer, async (req, res) => {
    try {
      const { id } = req.params;
      
      const reviews = await storage.getDocumentReviews(parseInt(id));
      res.json(reviews);
    } catch (error: any) {
      console.error("[LAWYER] Get reviews error:", error?.message);
      res.status(500).json({ error: "Ошибка получения истории проверок" });
    }
  });

  // Получить интеграции документов
  app.get("/api/lawyer/integrations", requireLawyer, async (req, res) => {
    try {
      const spellCheck = await storage.getSystemSetting("document_spell_check_enabled");
      const spellCheckProvider = await storage.getSystemSetting("document_spell_check_provider");
      const consultantPlus = await storage.getSystemSetting("document_consultant_plus_enabled");
      const garant = await storage.getSystemSetting("document_garant_enabled");
      
      res.json({
        spellCheck: {
          enabled: spellCheck?.value === "true",
          provider: spellCheckProvider?.value || "yandex",
        },
        legalServices: {
          consultantPlus: consultantPlus?.value === "true",
          garant: garant?.value === "true",
        },
      });
    } catch (error: any) {
      console.error("[LAWYER] Get integrations error:", error?.message);
      res.status(500).json({ error: "Ошибка получения интеграций" });
    }
  });

  // Пометить документ как доставленный
  app.post("/api/manager/documents/:id/deliver", requireManager, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      const document = await storage.getDocumentById(parseInt(id));
      if (!document) {
        return res.status(404).json({ error: "Документ не найден" });
      }
      
      if (user.role === "manager" && document.assignedManagerId !== user.id) {
        return res.status(403).json({ error: "Нет доступа к этому документу" });
      }
      
      if (document.status !== "approved") {
        return res.status(400).json({ error: "Только одобренные документы можно пометить как доставленные" });
      }
      
      const updated = await storage.updateDocument(parseInt(id), {
        status: "delivered",
        deliveredAt: new Date(),
        updatedAt: new Date(),
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("[MANAGER] Deliver document error:", error?.message);
      res.status(500).json({ error: "Ошибка доставки документа" });
    }
  });

  return httpServer;
}
