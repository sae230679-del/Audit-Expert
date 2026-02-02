import PDFDocument from "pdfkit";
import path from "path";
import type { AuditResults, AuditCriterion } from "@shared/schema";

const FONT_PATH_REGULAR = path.join(process.cwd(), "server/fonts/OpenSans-Regular.ttf");
const FONT_PATH_BOLD = path.join(process.cwd(), "server/fonts/OpenSans-Bold.ttf");

interface ReportData {
  siteUrl: string;
  email: string;
  siteType: string;
  totalScore: number;
  auditResults: AuditResults;
  createdAt: Date;
  orderId: string;
}

const COLORS = {
  primary: "#1E40AF",
  success: "#16A34A",
  warning: "#CA8A04",
  danger: "#DC2626",
  text: "#111827",
  textMuted: "#6B7280",
  bg: "#F8FAFC",
  border: "#E2E8F0",
  white: "#FFFFFF",
};

function getStatusColor(status: AuditCriterion["status"]): string {
  switch (status) {
    case "pass": return COLORS.success;
    case "warning": return COLORS.warning;
    case "fail": return COLORS.danger;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function generateAuditReportPDF(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    // Create document with autoFirstPage false to control page creation
    const doc = new PDFDocument({
      size: "A4",
      autoFirstPage: false,
      info: {
        Title: `Аудит 152-ФЗ - ${data.siteUrl}`,
        Author: "Help152FZ",
      },
    });

    doc.registerFont("Regular", FONT_PATH_REGULAR);
    doc.registerFont("Bold", FONT_PATH_BOLD);

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Add exactly one page
    doc.addPage({
      size: "A4",
      margins: { top: 20, bottom: 20, left: 35, right: 35 },
    });

    const pageWidth = doc.page.width - 70;
    const criteria = data.auditResults?.criteria || [];
    const passCount = criteria.filter(c => c.status === "pass").length;
    const warningCount = criteria.filter(c => c.status === "warning").length;
    const failCount = criteria.filter(c => c.status === "fail").length;

    // Header - compact 45px
    doc.rect(0, 0, doc.page.width, 45).fill(COLORS.primary);
    doc.font("Bold").fontSize(14).fillColor(COLORS.white).text("Help152FZ", 35, 15, { lineBreak: false });
    doc.font("Regular").fontSize(7).fillColor("#93C5FD")
       .text(`#${data.orderId.substring(0, 8).toUpperCase()}  •  ${formatDate(data.createdAt)}`, 400, 18, { align: "right", lineBreak: false });

    let y = 55;

    // Site info - single line
    doc.font("Bold").fontSize(10).fillColor(COLORS.primary).text(data.siteUrl, 35, y, { lineBreak: false });
    doc.font("Regular").fontSize(7).fillColor(COLORS.textMuted)
       .text(`${data.siteType || "Веб-сайт"}  •  ${data.email}`, 35, y + 12, { lineBreak: false });

    y += 30;

    // Score and stats - compact row
    const scoreColor = data.totalScore >= 70 ? COLORS.success : data.totalScore >= 40 ? COLORS.warning : COLORS.danger;
    const scoreLabel = data.totalScore >= 70 ? "Хорошо" : data.totalScore >= 40 ? "Внимание" : "Критично";
    const scoreBg = data.totalScore >= 70 ? "#DCFCE7" : data.totalScore >= 40 ? "#FEF9C3" : "#FEE2E2";

    doc.roundedRect(35, y, 110, 48, 5).fill(scoreBg);
    doc.font("Bold").fontSize(24).fillColor(scoreColor).text(`${data.totalScore}%`, 45, y + 8, { lineBreak: false });
    doc.font("Bold").fontSize(8).fillColor(scoreColor).text(scoreLabel, 45, y + 34, { lineBreak: false });

    const stats = [
      [passCount, COLORS.success, "#DCFCE7", "ОК"],
      [warningCount, COLORS.warning, "#FEF9C3", "Вним."],
      [failCount, COLORS.danger, "#FEE2E2", "Ошиб."]
    ];
    let statX = 155;
    stats.forEach(([count, color, bg, label]) => {
      doc.roundedRect(statX, y, 70, 48, 5).fill(bg as string);
      doc.font("Bold").fontSize(20).fillColor(color as string).text(String(count), statX + 10, y + 8, { lineBreak: false });
      doc.font("Regular").fontSize(7).fillColor(color as string).text(label as string, statX + 10, y + 32, { lineBreak: false });
      statX += 78;
    });

    y += 60;

    // Table title
    doc.font("Bold").fontSize(9).fillColor(COLORS.text).text("Результаты проверки по 9 критериям", 35, y, { lineBreak: false });
    y += 14;

    // Table header
    const rowHeight = 24;
    doc.rect(35, y, pageWidth, 20).fill(COLORS.primary);
    doc.font("Bold").fontSize(7).fillColor(COLORS.white);
    doc.text("Критерий", 42, y + 6, { lineBreak: false });
    doc.text("Статус", 320, y + 6, { lineBreak: false });
    doc.text("Штраф", 420, y + 6, { lineBreak: false });
    y += 20;

    // Table rows - 9 criteria
    criteria.forEach((criterion, i) => {
      const rowBg = i % 2 === 0 ? COLORS.white : COLORS.bg;
      doc.rect(35, y, pageWidth, rowHeight).fill(rowBg);
      
      doc.font("Regular").fontSize(7).fillColor(COLORS.text).text(criterion.name, 42, y + 8, { width: 270, lineBreak: false });
      
      const statusColor = getStatusColor(criterion.status);
      const statusBg = criterion.status === "pass" ? "#DCFCE7" : criterion.status === "warning" ? "#FEF9C3" : "#FEE2E2";
      const statusText = criterion.status === "pass" ? "ОК" : criterion.status === "warning" ? "Внимание" : "Ошибка";
      
      doc.roundedRect(315, y + 4, 60, 16, 8).fill(statusBg);
      doc.font("Bold").fontSize(6).fillColor(statusColor).text(statusText, 320, y + 9, { width: 50, align: "center", lineBreak: false });
      
      if (criterion.status !== "pass" && criterion.penalty) {
        doc.font("Regular").fontSize(7).fillColor(COLORS.danger).text(criterion.penalty, 410, y + 8, { lineBreak: false });
      } else {
        doc.font("Regular").fontSize(7).fillColor(COLORS.textMuted).text("—", 435, y + 8, { lineBreak: false });
      }
      
      y += rowHeight;
    });

    // Table border
    doc.rect(35, y - (criteria.length * rowHeight) - 20, pageWidth, (criteria.length * rowHeight) + 20).stroke(COLORS.border);

    y += 10;

    // Disclaimer - compact
    doc.roundedRect(35, y, pageWidth, 32, 3).fill("#FFF7ED");
    doc.rect(35, y, 3, 32).fill(COLORS.warning);
    doc.font("Bold").fontSize(7).fillColor(COLORS.warning).text("Важно:", 45, y + 6, { lineBreak: false });
    doc.font("Regular").fontSize(6).fillColor(COLORS.text)
       .text("Информационный отчет. Проверка на соответствие ФЗ-152 и ФЗ-149. Штрафы по ст. 13.11 КоАП РФ.", 45, y + 17, { width: pageWidth - 20, lineBreak: false });

    y += 38;

    // Footer - inline with content, no line break to prevent page overflow
    doc.font("Regular").fontSize(6).fillColor(COLORS.textMuted)
       .text("help152fz.ru  •  support@help152fz.ru", 35, y, { align: "center", width: pageWidth, lineBreak: false });

    doc.end();
  });
}
