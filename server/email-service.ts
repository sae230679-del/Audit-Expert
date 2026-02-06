import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { storage } from "./storage";

let transporter: Transporter | null = null;
let fromAddress: string = "";
let smtpEnabled: boolean = false;

function getEmailTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1a2744;padding:24px 32px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <div style="width:40px;height:40px;background-color:#3b82f6;border-radius:8px;display:inline-block;text-align:center;line-height:40px;font-size:20px;color:#ffffff;">&#128737;</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Help152FZ</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                Это письмо отправлено автоматически сервисом Help152FZ.<br>
                Если вы не совершали действий на нашей платформе, проигнорируйте это письмо.<br>
                Чтобы отказаться от рассылки, измените настройки уведомлений в личном кабинете.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildTransporterOptions(settings: {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpEncryption?: string | null;
}): SMTPTransport.Options {
  const port = settings.smtpPort || 587;
  const encryption = settings.smtpEncryption || "tls";

  const options: SMTPTransport.Options = {
    host: settings.smtpHost || "",
    port,
    auth: {
      user: settings.smtpUser || "",
      pass: settings.smtpPassword || "",
    },
  };

  if (encryption === "ssl") {
    options.secure = true;
  } else if (encryption === "tls") {
    options.secure = false;
    options.tls = { rejectUnauthorized: false };
  } else {
    options.secure = false;
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

export async function initEmailService(): Promise<void> {
  try {
    const settings = await storage.getSettings();
    if (!settings) {
      console.log("[EMAIL] No site settings found, email service disabled");
      return;
    }

    smtpEnabled = settings.smtpEnabled || false;

    if (!smtpEnabled) {
      console.log("[EMAIL] SMTP is disabled in settings");
      return;
    }

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      console.log("[EMAIL] SMTP settings incomplete, email service disabled");
      return;
    }

    const options = buildTransporterOptions(settings);
    transporter = nodemailer.createTransport(options);

    const name = settings.smtpFromName || "Help152FZ";
    const email = settings.smtpFromEmail || settings.smtpUser || "";
    fromAddress = `"${name}" <${email}>`;

    console.log("[EMAIL] Email service initialized successfully");
  } catch (error: any) {
    console.error("[EMAIL] Failed to initialize email service:", error?.message);
  }
}

export function updateEmailTransporter(settings: {
  smtpEnabled?: boolean | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  smtpFromName?: string | null;
  smtpFromEmail?: string | null;
  smtpEncryption?: string | null;
}): void {
  try {
    smtpEnabled = settings.smtpEnabled || false;

    if (!smtpEnabled) {
      transporter = null;
      console.log("[EMAIL] SMTP disabled via settings update");
      return;
    }

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      transporter = null;
      console.log("[EMAIL] SMTP settings incomplete after update");
      return;
    }

    const options = buildTransporterOptions(settings);
    transporter = nodemailer.createTransport(options);

    const name = settings.smtpFromName || "Help152FZ";
    const email = settings.smtpFromEmail || settings.smtpUser || "";
    fromAddress = `"${name}" <${email}>`;

    console.log("[EMAIL] Email transporter updated successfully");
  } catch (error: any) {
    console.error("[EMAIL] Failed to update email transporter:", error?.message);
  }
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!smtpEnabled || !transporter) {
    console.log("[EMAIL] Email not sent - SMTP disabled or transporter not configured");
    return { success: false, error: "SMTP не настроен или отключён" };
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[EMAIL] Email sent to ${options.to}: ${options.subject}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[EMAIL] Failed to send email to ${options.to}:`, error?.message);
    return { success: false, error: error?.message || "Неизвестная ошибка отправки" };
  }
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    return { success: false, error: "SMTP транспорт не настроен" };
  }

  try {
    await transporter.verify();
    console.log("[EMAIL] SMTP connection verified successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[EMAIL] SMTP connection verification failed:", error?.message);
    return { success: false, error: error?.message || "Не удалось подключиться к SMTP серверу" };
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Тестовое письмо</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Это тестовое письмо от платформы <strong>Help152FZ</strong>.
    </p>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Если вы получили это письмо, значит SMTP-настройки сконфигурированы правильно и email-уведомления работают корректно.
    </p>
    <p style="margin:0;color:#9ca3af;font-size:13px;">
      Дата отправки: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}
    </p>`;

  const html = getEmailTemplate("Тестовое письмо — Help152FZ", body);

  return sendEmail({
    to,
    subject: "Тестовое письмо — Help152FZ",
    html,
    text: "Это тестовое письмо от платформы Help152FZ. SMTP настроен корректно.",
  });
}

export async function sendWelcomeEmail(
  email: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Добро пожаловать на Help152FZ!</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Здравствуйте, <strong>${username}</strong>!
    </p>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Вы успешно зарегистрировались на платформе Help152FZ — сервисе проверки и приведения сайтов в соответствие требованиям 152-ФЗ «О персональных данных».
    </p>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Теперь вам доступны:
    </p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#374151;font-size:15px;line-height:1.8;">
      <li>Бесплатный экспресс-аудит вашего сайта</li>
      <li>Генерация документов для соответствия 152-ФЗ</li>
      <li>Личный кабинет с историей проверок</li>
      <li>Реферальная программа с бонусами</li>
    </ul>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
      Начните с проверки вашего сайта прямо сейчас!
    </p>`;

  const html = getEmailTemplate("Добро пожаловать — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: "Добро пожаловать на Help152FZ!",
    html,
    text: `Здравствуйте, ${username}! Вы успешно зарегистрировались на платформе Help152FZ.`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  username: string
): Promise<{ success: boolean; error?: string }> {
  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Восстановление пароля</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Здравствуйте, <strong>${username}</strong>!
    </p>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Мы получили запрос на восстановление пароля для вашей учётной записи на платформе Help152FZ.
    </p>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
      Нажмите на кнопку ниже, чтобы создать новый пароль:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td style="background-color:#3b82f6;border-radius:6px;">
          <a href="${resetLink}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Сбросить пароль</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
      Или скопируйте ссылку: <a href="${resetLink}" style="color:#3b82f6;">${resetLink}</a>
    </p>
    <p style="margin:0;color:#ef4444;font-size:13px;line-height:1.6;">
      Ссылка действительна 1 час. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
    </p>`;

  const html = getEmailTemplate("Восстановление пароля — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: "Восстановление пароля — Help152FZ",
    html,
    text: `Здравствуйте, ${username}! Для восстановления пароля перейдите по ссылке: ${resetLink}. Ссылка действительна 1 час.`,
  });
}

export async function sendExpressReportEmail(
  email: string,
  username: string,
  password: string,
  reportUrl: string,
  auditResults: { score149?: number; score152?: number; totalIssues?: number }
): Promise<{ success: boolean; error?: string }> {
  const score149 = auditResults.score149 !== undefined ? `${auditResults.score149}%` : "—";
  const score152 = auditResults.score152 !== undefined ? `${auditResults.score152}%` : "—";
  const issues = auditResults.totalIssues !== undefined ? auditResults.totalIssues : "—";

  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Ваш экспресс-отчёт готов!</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Здравствуйте, <strong>${username}</strong>!
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Ваш экспресс-аудит завершён. Ниже приведены результаты и данные для доступа к отчёту.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f8f9fb;border-radius:8px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Результаты аудита:</p>
          <table role="presentation" cellpadding="4" cellspacing="0">
            <tr><td style="color:#374151;font-size:14px;">149-ФЗ:</td><td style="color:#1a2744;font-size:14px;font-weight:600;">${score149}</td></tr>
            <tr><td style="color:#374151;font-size:14px;">152-ФЗ:</td><td style="color:#1a2744;font-size:14px;font-weight:600;">${score152}</td></tr>
            <tr><td style="color:#374151;font-size:14px;">Замечаний:</td><td style="color:#1a2744;font-size:14px;font-weight:600;">${issues}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 8px;font-size:14px;color:#1e40af;font-weight:600;">Данные для входа в личный кабинет:</p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;">Логин: <strong>${email}</strong></p>
          <p style="margin:0;font-size:14px;color:#374151;">Пароль: <strong>${password}</strong></p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
      <tr>
        <td style="background-color:#3b82f6;border-radius:6px;">
          <a href="${reportUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Открыть отчёт</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
      Рекомендуем сменить пароль после первого входа в личный кабинет.
    </p>`;

  const html = getEmailTemplate("Экспресс-отчёт готов — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: "Ваш экспресс-отчёт готов — Help152FZ",
    html,
    text: `Здравствуйте, ${username}! Ваш экспресс-отчёт готов. Логин: ${email}, Пароль: ${password}. Откройте отчёт: ${reportUrl}`,
  });
}

export async function sendOrderNotificationEmail(
  email: string,
  orderId: string,
  orderType: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const typeLabel = orderType === "express" ? "Экспресс-аудит" : "Полный аудит";

  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Новый заказ оформлен</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Ваш заказ успешно создан на платформе Help152FZ.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f8f9fb;border-radius:8px;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="4" cellspacing="0" width="100%">
            <tr><td style="color:#6b7280;font-size:14px;">Номер заказа:</td><td style="color:#1a2744;font-size:14px;font-weight:600;text-align:right;">#${orderId.slice(0, 8)}</td></tr>
            <tr><td style="color:#6b7280;font-size:14px;">Тип услуги:</td><td style="color:#1a2744;font-size:14px;font-weight:600;text-align:right;">${typeLabel}</td></tr>
            <tr><td style="color:#6b7280;font-size:14px;">Сумма:</td><td style="color:#1a2744;font-size:14px;font-weight:600;text-align:right;">${amount.toLocaleString("ru-RU")} &#8381;</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
      После оплаты мы приступим к выполнению заказа. Статус можно отслеживать в личном кабинете.
    </p>`;

  const html = getEmailTemplate("Новый заказ — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: `Заказ #${orderId.slice(0, 8)} оформлен — Help152FZ`,
    html,
    text: `Ваш заказ #${orderId.slice(0, 8)} (${typeLabel}) на сумму ${amount} руб. успешно создан на Help152FZ.`,
  });
}

export async function sendPaymentConfirmationEmail(
  email: string,
  orderId: string,
  amount: number,
  serviceName: string
): Promise<{ success: boolean; error?: string }> {
  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Оплата получена</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Благодарим за оплату! Ваш платёж успешно обработан.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="4" cellspacing="0" width="100%">
            <tr><td style="color:#065f46;font-size:14px;">Статус:</td><td style="color:#065f46;font-size:14px;font-weight:600;text-align:right;">Оплачено</td></tr>
            <tr><td style="color:#065f46;font-size:14px;">Заказ:</td><td style="color:#065f46;font-size:14px;font-weight:600;text-align:right;">#${orderId.slice(0, 8)}</td></tr>
            <tr><td style="color:#065f46;font-size:14px;">Услуга:</td><td style="color:#065f46;font-size:14px;font-weight:600;text-align:right;">${serviceName}</td></tr>
            <tr><td style="color:#065f46;font-size:14px;">Сумма:</td><td style="color:#065f46;font-size:14px;font-weight:600;text-align:right;">${amount.toLocaleString("ru-RU")} &#8381;</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
      Мы уже приступили к работе над вашим заказом. Результат будет доступен в личном кабинете.
    </p>`;

  const html = getEmailTemplate("Оплата подтверждена — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: `Оплата подтверждена — заказ #${orderId.slice(0, 8)} — Help152FZ`,
    html,
    text: `Оплата заказа #${orderId.slice(0, 8)} на сумму ${amount} руб. за "${serviceName}" подтверждена. Спасибо!`,
  });
}

export async function sendReferralNotificationEmail(
  email: string,
  referralEmail: string,
  type: "new_referral" | "new_order" | "new_payout"
): Promise<{ success: boolean; error?: string }> {
  let title: string;
  let message: string;

  switch (type) {
    case "new_referral":
      title = "Новый реферал!";
      message = `По вашей реферальной ссылке зарегистрировался новый пользователь: <strong>${referralEmail}</strong>. Вы получите бонус после его первой покупки.`;
      break;
    case "new_order":
      title = "Ваш реферал сделал заказ!";
      message = `Пользователь <strong>${referralEmail}</strong>, зарегистрированный по вашей ссылке, оформил заказ. Комиссия будет начислена после оплаты.`;
      break;
    case "new_payout":
      title = "Выплата по реферальной программе";
      message = `Комиссия за реферала <strong>${referralEmail}</strong> была начислена на ваш баланс. Вы можете запросить выплату в личном кабинете.`;
      break;
  }

  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">${title}</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      ${message}
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#92400e;">
            Подробности доступны в разделе «Реферальная программа» вашего личного кабинета.
          </p>
        </td>
      </tr>
    </table>`;

  const html = getEmailTemplate(`${title} — Help152FZ`, body);

  return sendEmail({
    to: email,
    subject: `${title} — Help152FZ`,
    html,
    text: `${title}. ${message.replace(/<[^>]*>/g, "")}`,
  });
}

export async function sendPayoutNotificationEmail(
  email: string,
  amount: number,
  status: "pending" | "processing" | "completed" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  const statusLabels: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    pending: { label: "Ожидает рассмотрения", color: "#92400e", bgColor: "#fef3c7", borderColor: "#fcd34d" },
    processing: { label: "В обработке", color: "#1e40af", bgColor: "#eff6ff", borderColor: "#bfdbfe" },
    completed: { label: "Выплачено", color: "#065f46", bgColor: "#ecfdf5", borderColor: "#a7f3d0" },
    rejected: { label: "Отклонено", color: "#991b1b", bgColor: "#fef2f2", borderColor: "#fecaca" },
  };

  const info = statusLabels[status] || statusLabels.pending;

  const body = `
    <h2 style="margin:0 0 16px;color:#1a2744;font-size:20px;">Уведомление о выплате</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
      Статус вашего запроса на выплату обновлён.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:${info.bgColor};border-radius:8px;border:1px solid ${info.borderColor};">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="4" cellspacing="0" width="100%">
            <tr><td style="color:${info.color};font-size:14px;">Сумма:</td><td style="color:${info.color};font-size:14px;font-weight:600;text-align:right;">${amount.toLocaleString("ru-RU")} &#8381;</td></tr>
            <tr><td style="color:${info.color};font-size:14px;">Статус:</td><td style="color:${info.color};font-size:14px;font-weight:600;text-align:right;">${info.label}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0;color:#374151;font-size:15px;line-height:1.6;">
      Подробности доступны в личном кабинете в разделе «Выплаты».
    </p>`;

  const html = getEmailTemplate("Выплата — Help152FZ", body);

  return sendEmail({
    to: email,
    subject: `Выплата ${amount.toLocaleString("ru-RU")} ₽ — ${info.label} — Help152FZ`,
    html,
    text: `Статус выплаты на сумму ${amount} руб. обновлён: ${info.label}.`,
  });
}
