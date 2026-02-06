import { storage } from "./storage";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendExpressReportEmail,
  sendOrderNotificationEmail,
  sendPaymentConfirmationEmail,
  sendReferralNotificationEmail,
  sendPayoutNotificationEmail,
} from "./email-service";
import {
  notifyExpressReportRequest,
  notifyNewOrder,
  notifySuccessfulPayment,
  notifyReferralRegistration,
} from "./telegram-notifications";

export type NotifyEvent =
  | "user_registered"
  | "password_reset"
  | "new_order"
  | "payment_success"
  | "new_referral"
  | "referral_order"
  | "referral_payout"
  | "express_report"
  | "express_report_temp_user";

export interface NotifyData {
  userId?: string;
  email?: string;
  username?: string;
  password?: string;
  orderId?: string;
  orderType?: string;
  amount?: number;
  serviceName?: string;
  referralEmail?: string;
  resetLink?: string;
  reportUrl?: string;
  auditResults?: any;
  payoutStatus?: string;
  siteUrl?: string;
}

export async function notifyAdmins(title: string, message: string, link?: string) {
  try {
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter(
      (u) => u.role === "admin" || u.role === "superadmin"
    );
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        title,
        message,
        type: "info",
        link: link || null,
      });
    }
  } catch (err: any) {
    console.error("[NOTIFY] Ошибка уведомления админов:", err?.message);
  }
}

export async function dispatchNotification(event: NotifyEvent, data: NotifyData) {
  try {
    const settings = await storage.getSettings();

    let userSub: any = null;
    if (data.userId) {
      try {
        userSub = await storage.getUserSubscription(data.userId);
      } catch {}
    }

    switch (event) {
      case "user_registered":
        await handleUserRegistered(settings, userSub, data);
        break;
      case "password_reset":
        await handlePasswordReset(settings, userSub, data);
        break;
      case "new_order":
        await handleNewOrder(settings, userSub, data);
        break;
      case "payment_success":
        await handlePaymentSuccess(settings, userSub, data);
        break;
      case "new_referral":
        await handleNewReferral(settings, userSub, data);
        break;
      case "referral_order":
        await handleReferralOrder(settings, userSub, data);
        break;
      case "referral_payout":
        await handleReferralPayout(settings, userSub, data);
        break;
      case "express_report":
        await handleExpressReport(settings, userSub, data);
        break;
      case "express_report_temp_user":
        await handleExpressReportTempUser(settings, userSub, data);
        break;
    }
  } catch (err: any) {
    console.error(`[NOTIFY] Ошибка dispatch (${event}):`, err?.message);
  }
}

async function handleUserRegistered(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Добро пожаловать!",
      message: "Вы успешно зарегистрировались на платформе Help152FZ.",
      type: "success",
    });
  }

  if (data.email && data.username) {
    if (settings?.notifyEmailRegistration !== false) {
      if (!userSub || userSub.emailNews !== false) {
        await safeCall(() => sendWelcomeEmail(data.email!, data.username!));
      }
    }
  }

  if (settings?.notifyTgRegistration !== false && data.email) {
    await safeCall(() =>
      notifyReferralRegistration({ email: data.email! })
    );
  }

  await notifyAdmins(
    "Новая регистрация",
    `Зарегистрирован пользователь: ${data.email || data.username || "—"}`,
    "/admin/users"
  );
}

async function handlePasswordReset(settings: any, userSub: any, data: NotifyData) {
  if (!data.email || !data.resetLink || !data.username) return;

  if (settings?.notifyEmailPasswordReset !== false) {
    if (!userSub || userSub.emailPasswordReset !== false) {
      await safeCall(() =>
        sendPasswordResetEmail(data.email!, data.resetLink!, data.username!)
      );
    }
  }
}

async function handleNewOrder(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Заказ оформлен",
      message: `Ваш заказ #${(data.orderId || "").slice(0, 8)} успешно создан.`,
      type: "info",
      link: "/cabinet",
    });
  }

  if (data.email && data.orderId) {
    if (settings?.notifyEmailOrder !== false) {
      if (!userSub || userSub.emailOrders !== false) {
        await safeCall(() =>
          sendOrderNotificationEmail(
            data.email!,
            data.orderId!,
            data.orderType || "express",
            data.amount || 0
          )
        );
      }
    }
  }

  if (settings?.notifyTgOrder !== false && data.email && data.orderId) {
    await safeCall(() =>
      notifyNewOrder({
        email: data.email!,
        orderType: data.orderType || "express",
        amount: data.amount,
        orderId: parseInt(data.orderId!.slice(0, 8), 16) || 0,
      })
    );
  }

  await notifyAdmins(
    "Новый заказ",
    `Заказ #${(data.orderId || "").slice(0, 8)} от ${data.email || "—"} на сумму ${data.amount || 0} ₽`,
    "/admin/orders"
  );
}

async function handlePaymentSuccess(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Оплата подтверждена",
      message: `Оплата ${data.amount || 0} ₽ за "${data.serviceName || "услугу"}" получена.`,
      type: "success",
      link: "/cabinet",
    });
  }

  if (data.email && data.orderId) {
    if (settings?.notifyEmailPayment !== false) {
      if (!userSub || userSub.emailPayments !== false) {
        await safeCall(() =>
          sendPaymentConfirmationEmail(
            data.email!,
            data.orderId!,
            data.amount || 0,
            data.serviceName || "Услуга"
          )
        );
      }
    }
  }

  if (settings?.notifyTgPayment !== false && data.email) {
    await safeCall(() =>
      notifySuccessfulPayment({
        email: data.email!,
        amount: data.amount || 0,
        serviceName: data.serviceName || "Услуга",
        orderId: data.orderId
          ? parseInt(data.orderId.slice(0, 8), 16) || undefined
          : undefined,
      })
    );
  }

  await notifyAdmins(
    "Оплата получена",
    `Оплата ${data.amount || 0} ₽ от ${data.email || "—"} (заказ #${(data.orderId || "").slice(0, 8)})`,
    "/admin/payments"
  );
}

async function handleNewReferral(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Новый реферал!",
      message: `По вашей ссылке зарегистрировался: ${data.referralEmail || "—"}`,
      type: "success",
      link: "/referral",
    });
  }

  if (data.email && data.referralEmail) {
    if (settings?.notifyEmailReferral !== false) {
      if (!userSub || userSub.emailReferrals !== false) {
        await safeCall(() =>
          sendReferralNotificationEmail(data.email!, data.referralEmail!, "new_referral")
        );
      }
    }
  }

  if (settings?.notifyTgReferral !== false && data.referralEmail) {
    await safeCall(() =>
      notifyReferralRegistration({
        email: data.referralEmail!,
        referrerEmail: data.email,
      })
    );
  }
}

async function handleReferralOrder(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Реферал сделал заказ!",
      message: `Ваш реферал ${data.referralEmail || "—"} оформил заказ. Комиссия будет начислена после оплаты.`,
      type: "info",
      link: "/referral",
    });
  }

  if (data.email && data.referralEmail) {
    if (settings?.notifyEmailReferral !== false) {
      if (!userSub || userSub.emailReferrals !== false) {
        await safeCall(() =>
          sendReferralNotificationEmail(data.email!, data.referralEmail!, "new_order")
        );
      }
    }
  }
}

async function handleReferralPayout(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Выплата обновлена",
      message: `Статус выплаты ${data.amount || 0} ₽: ${getPayoutStatusLabel(data.payoutStatus)}.`,
      type: data.payoutStatus === "completed" ? "success" : "info",
      link: "/referral",
    });
  }

  if (data.email) {
    if (settings?.notifyEmailReferral !== false) {
      if (!userSub || userSub.emailReferrals !== false) {
        const status = (data.payoutStatus || "pending") as "pending" | "processing" | "completed" | "rejected";
        await safeCall(() =>
          sendPayoutNotificationEmail(data.email!, data.amount || 0, status)
        );
      }
    }
  }
}

async function handleExpressReport(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Экспресс-отчёт готов",
      message: "Ваш экспресс-аудит завершён. Результаты доступны в личном кабинете.",
      type: "success",
      link: data.reportUrl || "/cabinet",
    });
  }

  if (settings?.notifyTgExpressReport !== false && data.email && data.siteUrl) {
    await safeCall(() =>
      notifyExpressReportRequest({
        url: data.siteUrl!,
        email: data.email!,
        score149: data.auditResults?.score149,
        score152: data.auditResults?.score152,
      })
    );
  }

  await notifyAdmins(
    "Экспресс-отчёт",
    `Экспресс-аудит завершён для ${data.email || "—"} (${data.siteUrl || "—"})`,
    "/admin/orders"
  );
}

async function handleExpressReportTempUser(settings: any, userSub: any, data: NotifyData) {
  if (data.userId) {
    await safeCreateNotification({
      userId: data.userId,
      title: "Экспресс-отчёт готов",
      message: "Ваш экспресс-аудит завершён. Данные для входа отправлены на почту.",
      type: "success",
      link: data.reportUrl || "/cabinet",
    });
  }

  if (data.email && data.username && data.password && data.reportUrl) {
    if (settings?.notifyEmailExpressReport !== false) {
      await safeCall(() =>
        sendExpressReportEmail(
          data.email!,
          data.username!,
          data.password!,
          data.reportUrl!,
          data.auditResults || {}
        )
      );
    }
  }

  if (settings?.notifyTgExpressReport !== false && data.email && data.siteUrl) {
    await safeCall(() =>
      notifyExpressReportRequest({
        url: data.siteUrl!,
        email: data.email!,
        score149: data.auditResults?.score149,
        score152: data.auditResults?.score152,
      })
    );
  }

  await notifyAdmins(
    "Экспресс-отчёт (новый пользователь)",
    `Создан временный аккаунт и отчёт для ${data.email || "—"}`,
    "/admin/orders"
  );
}

function getPayoutStatusLabel(status?: string): string {
  switch (status) {
    case "pending": return "Ожидает рассмотрения";
    case "processing": return "В обработке";
    case "completed": return "Выплачено";
    case "rejected": return "Отклонено";
    default: return "Обновлено";
  }
}

async function safeCreateNotification(data: {
  userId: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
}) {
  try {
    await storage.createNotification({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || "info",
      link: data.link || null,
    });
  } catch (err: any) {
    console.error("[NOTIFY] Ошибка создания уведомления:", err?.message);
  }
}

async function safeCall(fn: () => Promise<any>) {
  try {
    await fn();
  } catch (err: any) {
    console.error("[NOTIFY] Ошибка отправки:", err?.message);
  }
}
