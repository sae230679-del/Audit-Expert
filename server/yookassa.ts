import { YooCheckout } from '@a2seven/yoo-checkout';
import { storage } from './storage';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

let checkout: YooCheckout | null = null;

async function getCheckout(): Promise<YooCheckout | null> {
  const settings = await storage.getSettings();
  
  if (!settings?.yookassaShopId || !settings?.yookassaSecretKey) {
    console.log('YooKassa credentials not configured');
    return null;
  }

  if (!checkout) {
    checkout = new YooCheckout({
      shopId: settings.yookassaShopId,
      secretKey: settings.yookassaSecretKey,
    });
  }

  return checkout;
}

export function resetCheckout() {
  checkout = null;
}

interface CreatePaymentParams {
  amount: number;
  description: string;
  returnUrl: string;
  orderId: string;
  userEmail?: string;
  testMode?: boolean;
}

export async function createPayment(params: CreatePaymentParams) {
  const yooCheckout = await getCheckout();
  
  if (!yooCheckout) {
    throw new Error('YooKassa не настроена. Проверьте настройки в админ-панели.');
  }

  const idempotenceKey = `order_${params.orderId}_${Date.now()}`;

  const paymentData: any = {
    amount: {
      value: params.amount.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: params.returnUrl,
    },
    capture: true,
    description: params.description,
    metadata: {
      orderId: params.orderId,
    },
  };

  if (params.userEmail) {
    paymentData.receipt = {
      customer: { email: params.userEmail },
      items: [{
        description: params.description.substring(0, 128),
        quantity: '1',
        amount: {
          value: params.amount.toFixed(2),
          currency: 'RUB',
        },
        vat_code: 1,
      }],
    };
  }

  try {
    const payment = await yooCheckout.createPayment(paymentData, idempotenceKey);
    return payment;
  } catch (error: any) {
    console.error('YooKassa payment error:', error);
    throw new Error(error.message || 'Ошибка создания платежа');
  }
}

export async function getPaymentInfo(paymentId: string) {
  const yooCheckout = await getCheckout();
  
  if (!yooCheckout) {
    throw new Error('YooKassa не настроена');
  }

  try {
    const payment = await yooCheckout.getPayment(paymentId);
    return payment;
  } catch (error: any) {
    console.error('YooKassa get payment error:', error);
    throw new Error(error.message || 'Ошибка получения информации о платеже');
  }
}

export interface YooKassaWebhookEvent {
  type: string;
  event: string;
  object: {
    id: string;
    status: string;
    amount: {
      value: string;
      currency: string;
    };
    metadata?: {
      orderId?: string;
    };
    paid?: boolean;
    captured_at?: string;
  };
}

export async function handleWebhook(body: YooKassaWebhookEvent, ipAddress?: string) {
  const { event, object } = body;

  const yookassaIps = [
    '185.71.76.0/27',
    '185.71.77.0/27', 
    '77.75.153.0/25',
    '77.75.156.11',
    '77.75.156.35',
    '77.75.154.128/25',
    '2a02:5180::/32'
  ];

  if (!event || !object || !object.id) {
    console.warn('YooKassa webhook: invalid event structure');
    throw new Error('Invalid webhook structure');
  }

  console.log('YooKassa webhook received:', event, object.id);

  if (event === 'payment.succeeded') {
    const orderId = object.metadata?.orderId;
    
    if (orderId) {
      await storage.updateOrder(orderId, {
        paymentId: object.id,
        paymentStatus: 'succeeded',
        status: 'paid',
        paidAt: new Date(),
      });

      const orderAmount = parseFloat(object.amount.value);
      await processReferralCommission(orderId, orderAmount);
      
      console.log(`Order ${orderId} marked as paid`);
    }
  } else if (event === 'payment.canceled') {
    const orderId = object.metadata?.orderId;
    
    if (orderId) {
      await storage.updateOrder(orderId, {
        paymentId: object.id,
        paymentStatus: 'canceled',
      });
      
      console.log(`Order ${orderId} payment canceled`);
    }
  }

  return { success: true };
}

export async function processReferralCommission(orderId: string, orderAmount: number) {
  try {
    const order = await storage.getOrder(orderId);
    if (!order?.userId) return;

    const existingCommissions = await storage.getCommissionsByOrderId(orderId);
    if (existingCommissions.length > 0) {
      console.log(`[REFERRAL] Commission already exists for order ${orderId}, skipping`);
      return;
    }

    const user = await storage.getUser(order.userId);
    if (!user?.referredBy) return;

    const referralSettings = await storage.getReferralSettings();
    if (!referralSettings?.isActive) return;

    const commissionPercent = referralSettings.commissionPercent || 20;
    const commissionAmount = Math.floor(orderAmount * commissionPercent / 100);

    const referrer = await storage.getUser(user.referredBy);
    if (!referrer) return;

    const referral = (await storage.getReferralsByReferrerId(referrer.id))
      .find(r => r.refereeId === String(order.userId));

    await storage.createCommission({
      userId: referrer.id,
      orderId,
      referralId: referral?.id || null,
      amount: commissionAmount,
      type: 'referral',
      status: 'credited',
    });

    if (referral) {
      await storage.updateReferral(referral.id, {
        status: 'paid',
        commissionEarned: (referral.commissionEarned || 0) + commissionAmount,
      });
    }

    await db.update(users)
      .set({ bonusBalance: (referrer.bonusBalance || 0) + commissionAmount })
      .where(eq(users.id, referrer.id));

    console.log(`[REFERRAL] Commission ${commissionAmount} credited to referrer ${referrer.id} for order ${orderId}`);
  } catch (error) {
    console.error('Error processing referral commission:', error);
  }
}
