import crypto from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import type { InitializePaymentInput, InitializePaymentResult, PaymentProvider, ProviderPaymentStatus, WebhookEvent } from './payment-provider';

/**
 * iyzico sandbox adaptörü (Aşama 9).
 *
 * Kart verisi yalnızca bu istek gövdesinde iyzico'ya iletilir; loglanmaz, saklanmaz.
 * Anahtarlar yalnızca ortam değişkenlerinden okunur (IYZICO_API_KEY / IYZICO_SECRET_KEY).
 *
 * Webhook: HMAC-SHA256(rawBody, IYZICO_SECRET_KEY) → X-IYZ-Signature
 * Bu, sandbox bildirimleri için sözleşmedir; üretimde iyzico'nun resmi imza
 * doğrulaması kullanılmalıdır.
 */
export class IyzicoPaymentProvider implements PaymentProvider {
  readonly name = 'iyzico';
  private statuses = new Map<string, ProviderPaymentStatus>();

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) {
      throw new Error('IYZICO_API_KEY ve IYZICO_SECRET_KEY tanımlı değil.');
    }
    if (!input.card) {
      return { providerPaymentId: `iyz_${crypto.randomUUID()}`, status: 'FAILED', failureReason: 'Kart bilgisi eksik' };
    }

    const price = (input.amountCents / 100).toFixed(2);
    const conversationId = input.orderId;
    const payload = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice: price,
      currency: 'TRY',
      installment: 1,
      paymentChannel: 'WEB',
      paymentGroup: 'PRODUCT',
      paymentCard: {
        cardHolderName: input.card.holderName,
        cardNumber: input.card.number,
        expireMonth: String(input.card.expMonth).padStart(2, '0'),
        expireYear: String(input.card.expYear),
        cvc: input.card.cvc,
        registerCard: 0,
      },
      buyer: {
        id: input.orderId,
        name: input.buyer.firstName,
        surname: input.buyer.lastName,
        gsmNumber: input.buyer.phone,
        email: input.buyer.email,
        identityNumber: '11111111111',
        registrationAddress: 'N/A',
        ip: '127.0.0.1',
        city: 'Istanbul',
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: `${input.buyer.firstName} ${input.buyer.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'N/A',
      },
      billingAddress: {
        contactName: `${input.buyer.firstName} ${input.buyer.lastName}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'N/A',
      },
      basketItems: [
        {
          id: input.orderNumber,
          name: `Sipariş ${input.orderNumber}`,
          category1: 'Giyim',
          itemType: 'PHYSICAL',
          price,
        },
      ],
    };

    const uri = '/payment/auth';
    const body = JSON.stringify(payload);
    let json: { status?: string; paymentStatus?: string; paymentId?: string; errorMessage?: string };
    try {
      const res = await fetch(`${env.IYZICO_BASE_URL}${uri}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: iyzicoAuth(uri, body),
          'x-iyzi-rnd': lastRandom,
        },
        body,
      });
      json = (await res.json()) as typeof json;
    } catch (e) {
      logger.error({ err: e instanceof Error ? e.message : 'network' }, 'iyzico istek hatası');
      return { providerPaymentId: `iyz_fail_${conversationId}`, status: 'FAILED', failureReason: 'Ödeme sağlayıcısına ulaşılamadı', cardLast4: input.card.number.slice(-4) };
    }

    const providerPaymentId = json.paymentId ? String(json.paymentId) : `iyz_${conversationId}`;
    const ok = json.status === 'success' && (json.paymentStatus === 'SUCCESS' || json.paymentStatus === 'SUCCESSFUL');
    const status: ProviderPaymentStatus = ok ? 'PAID' : 'FAILED';
    this.statuses.set(providerPaymentId, status);
    return {
      providerPaymentId,
      status,
      cardLast4: input.card.number.slice(-4),
      failureReason: ok ? undefined : json.errorMessage || 'Ödeme alınamadı',
    };
  }

  async verifyPayment(providerPaymentId: string) {
    return { status: this.statuses.get(providerPaymentId) ?? 'PENDING' };
  }

  async handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookEvent> {
    const signature = String(headers['x-iyz-signature'] ?? headers['X-IYZ-Signature'] ?? '');
    const expected = crypto.createHmac('sha256', env.IYZICO_SECRET_KEY ?? '').update(rawBody).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw AppError.unauthorized('Webhook imzası geçersiz');
    let payload: { eventId?: string; providerPaymentId?: string; paymentId?: string; status?: string };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      throw AppError.validation('Webhook gövdesi geçersiz');
    }
    const providerPaymentId = payload.providerPaymentId ?? payload.paymentId;
    if (!payload.eventId || !providerPaymentId || !['PAID', 'FAILED', 'PENDING'].includes(payload.status ?? '')) {
      throw AppError.validation('Webhook alanları eksik');
    }
    const status = payload.status as ProviderPaymentStatus;
    this.statuses.set(providerPaymentId, status);
    return { eventId: payload.eventId, providerPaymentId, status };
  }

  async refundPayment(providerPaymentId: string, amountCents: number) {
    if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) return { status: 'FAILED' as const };
    const uri = '/payment/refund';
    const body = JSON.stringify({
      locale: 'tr',
      conversationId: providerPaymentId,
      paymentTransactionId: providerPaymentId,
      price: (amountCents / 100).toFixed(2),
      currency: 'TRY',
      ip: '127.0.0.1',
    });
    try {
      const res = await fetch(`${env.IYZICO_BASE_URL}${uri}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: iyzicoAuth(uri, body), 'x-iyzi-rnd': lastRandom },
        body,
      });
      const json = (await res.json()) as { status?: string };
      if (json.status === 'success') {
        this.statuses.set(providerPaymentId, 'FAILED');
        return { status: 'REFUNDED' as const };
      }
    } catch (e) {
      logger.error({ err: e instanceof Error ? e.message : 'network' }, 'iyzico iade hatası');
    }
    return { status: 'FAILED' as const };
  }
}

let lastRandom = '';

function iyzicoAuth(uri: string, body: string): string {
  const apiKey = env.IYZICO_API_KEY!;
  const secretKey = env.IYZICO_SECRET_KEY!;
  lastRandom = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHmac('sha256', secretKey).update(lastRandom + uri + body).digest('hex');
  const packed = [`apiKey:${apiKey}`, `randomKey:${lastRandom}`, `signature:${hash}`].join('&');
  return `IYZWSv2 ${Buffer.from(packed).toString('base64')}`;
}
