import crypto from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors';
import type { InitializePaymentInput, InitializePaymentResult, PaymentProvider, ProviderPaymentStatus, WebhookEvent } from './payment-provider';

/**
 * Mock ödeme sağlayıcısı (yalnızca geliştirme/test).
 * Test kartları:
 *  - 4111 1111 1111 1111 -> başarılı
 *  - 4000 0000 0000 0002 -> reddedildi (yetersiz bakiye)
 *  - 4000 0000 0000 0069 -> süresi dolmuş kart
 *  - Diğer geçerli numaralar -> başarılı
 * Webhook imzası: HMAC-SHA256(rawBody, MOCK_WEBHOOK_SECRET) -> X-Mock-Signature başlığı
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private statuses = new Map<string, ProviderPaymentStatus>();

  async initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const providerPaymentId = `mock_${crypto.randomUUID()}`;
    const number = input.card?.number ?? '';
    const last4 = number.slice(-4);

    if (!input.card) {
      this.statuses.set(providerPaymentId, 'FAILED');
      return { providerPaymentId, status: 'FAILED', failureReason: 'Kart bilgisi eksik' };
    }
    if (!luhnValid(number)) {
      this.statuses.set(providerPaymentId, 'FAILED');
      return { providerPaymentId, status: 'FAILED', cardLast4: last4, failureReason: 'Kart numarası geçersiz' };
    }
    const now = new Date();
    const expired = input.card.expYear < now.getFullYear() || (input.card.expYear === now.getFullYear() && input.card.expMonth < now.getMonth() + 1);
    if (expired || number === '4000000000000069') {
      this.statuses.set(providerPaymentId, 'FAILED');
      return { providerPaymentId, status: 'FAILED', cardLast4: last4, failureReason: 'Kartın süresi dolmuş' };
    }
    if (number === '4000000000000002') {
      this.statuses.set(providerPaymentId, 'FAILED');
      return { providerPaymentId, status: 'FAILED', cardLast4: last4, failureReason: 'Banka işlemi reddetti (yetersiz bakiye)' };
    }
    this.statuses.set(providerPaymentId, 'PAID');
    return { providerPaymentId, status: 'PAID', cardLast4: last4 };
  }

  async verifyPayment(providerPaymentId: string) {
    return { status: this.statuses.get(providerPaymentId) ?? 'PENDING' };
  }

  async handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookEvent> {
    const signature = String(headers['x-mock-signature'] ?? '');
    const expected = crypto.createHmac('sha256', env.MOCK_WEBHOOK_SECRET).update(rawBody).digest('hex');
    const a = Buffer.from(signature, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw AppError.unauthorized('Webhook imzası geçersiz');
    let payload: { eventId?: string; providerPaymentId?: string; status?: string };
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as typeof payload;
    } catch {
      throw AppError.validation('Webhook gövdesi geçersiz');
    }
    if (!payload.eventId || !payload.providerPaymentId || !['PAID', 'FAILED', 'PENDING'].includes(payload.status ?? '')) {
      throw AppError.validation('Webhook alanları eksik');
    }
    const status = payload.status as ProviderPaymentStatus;
    this.statuses.set(payload.providerPaymentId, status);
    return { eventId: payload.eventId, providerPaymentId: payload.providerPaymentId, status };
  }

  async refundPayment(providerPaymentId: string) {
    const current = this.statuses.get(providerPaymentId);
    if (current !== 'PAID') return { status: 'FAILED' as const };
    this.statuses.set(providerPaymentId, 'FAILED');
    return { status: 'REFUNDED' as const };
  }
}

export function luhnValid(number: string): boolean {
  if (!/^\d{13,19}$/.test(number)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}
