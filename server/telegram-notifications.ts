import { storage } from "./storage";

interface TelegramSettings {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

let telegramSettings: TelegramSettings | null = null;

export async function initTelegramNotifications() {
  try {
    const settings = await storage.getSettings();
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      telegramSettings = {
        botToken: settings.telegramBotToken,
        chatId: settings.telegramChatId,
        enabled: settings.telegramNotificationsEnabled || false,
      };
      console.log("Telegram notifications:", telegramSettings.enabled ? "enabled" : "disabled");
    }
  } catch (error) {
    console.log("Telegram settings not found");
  }
}

export function updateTelegramSettings(settings: TelegramSettings) {
  telegramSettings = settings;
}

async function sendTelegramMessage(text: string): Promise<boolean> {
  if (!telegramSettings?.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramSettings.chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[TELEGRAM] Send error:", error);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error("[TELEGRAM] Network error:", error?.message);
    return false;
  }
}

export async function notifyExpressReportRequest(data: {
  url: string;
  email: string;
  score149?: number;
  score152?: number;
}) {
  const text = `🔔 <b>Заявка на экспресс-отчёт</b>

📧 Email: ${data.email}
🌐 Сайт: ${data.url}
${data.score149 !== undefined ? `📊 Оценка 149-ФЗ: ${data.score149}%` : ""}
${data.score152 !== undefined ? `📊 Оценка 152-ФЗ: ${data.score152}%` : ""}

💰 Стоимость: 900 ₽`;

  await sendTelegramMessage(text);
}

export async function notifyFullAuditRequest(data: {
  url: string;
  email: string;
  phone?: string;
  packageName?: string;
  price?: number;
}) {
  const text = `🔔 <b>Заявка на полный аудит</b>

📧 Email: ${data.email}
${data.phone ? `📞 Телефон: ${data.phone}` : ""}
🌐 Сайт: ${data.url}
${data.packageName ? `📦 Пакет: ${data.packageName}` : ""}
${data.price ? `💰 Стоимость: ${data.price} ₽` : ""}`;

  await sendTelegramMessage(text);
}

export async function notifyContactFormMessage(data: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const text = `📨 <b>Сообщение с формы связи</b>

👤 Имя: ${data.name}
📧 Email: ${data.email}
${data.phone ? `📞 Телефон: ${data.phone}` : ""}

💬 Сообщение:
${data.message.substring(0, 500)}${data.message.length > 500 ? "..." : ""}`;

  await sendTelegramMessage(text);
}

export async function notifyReferralRegistration(data: {
  email: string;
  referrerEmail?: string;
}) {
  const text = `👥 <b>Новая регистрация в реферальной программе</b>

📧 Email: ${data.email}
${data.referrerEmail ? `🔗 Пригласил: ${data.referrerEmail}` : ""}`;

  await sendTelegramMessage(text);
}

export async function notifySuccessfulPayment(data: {
  email: string;
  amount: number;
  serviceName: string;
  orderId?: number;
}) {
  const text = `✅ <b>Успешная оплата</b>

📧 Email: ${data.email}
💰 Сумма: ${data.amount} ₽
🛒 Услуга: ${data.serviceName}
${data.orderId ? `📋 Заказ #${data.orderId}` : ""}`;

  await sendTelegramMessage(text);
}

export async function notifyNewOrder(data: {
  email: string;
  orderType: string;
  amount?: number;
  orderId: number;
}) {
  const text = `🛒 <b>Новый заказ #${data.orderId}</b>

📧 Email: ${data.email}
📦 Тип: ${data.orderType}
${data.amount ? `💰 Сумма: ${data.amount} ₽` : ""}`;

  await sendTelegramMessage(text);
}
