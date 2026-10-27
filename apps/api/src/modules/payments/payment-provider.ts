import type { CardInput } from '@shop/shared';

export type ProviderPaymentStatus = 'PAID' | 'FAILED' | 'PENDING';

export interface InitializePaymentInput {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency: 'TRY';
  buyer: { email: string; firstName: string; lastName: string; phone: string };
  /** Kart verisi yalnızca bellekte kalır, asla saklanmaz veya loglanmaz. */
  card?: CardInput;
  callbackUrl?: string;
}

export interface InitializePaymentResult {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  /** 3D Secure / barındırılan ödeme sayfası için yönlendirme adresi */
  redirectUrl?: string;
  cardLast4?: string;
  failureReason?: string;
}

export interface WebhookEvent {
  eventId: string;
  providerPaymentId: string;
  status: ProviderPaymentStatus;
}

/**
 * Sağlayıcıdan bağımsız ödeme arayüzü. Mock ve iyzico adaptörleri bunu uygular.
 */
export interface PaymentProvider {
  readonly name: string;
  initializePayment(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  verifyPayment(providerPaymentId: string): Promise<{ status: ProviderPaymentStatus }>;
  /** İmza doğrulaması başarısızsa hata fırlatmalıdır. */
  handleWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookEvent>;
  refundPayment(providerPaymentId: string, amountCents: number): Promise<{ status: 'REFUNDED' | 'FAILED' }>;
}
