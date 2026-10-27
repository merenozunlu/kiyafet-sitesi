import { env } from '../../config/env';
import type { PaymentProvider } from './payment-provider';
import { MockPaymentProvider } from './mock.provider';
import { IyzicoPaymentProvider } from './iyzico.provider';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  if (env.PAYMENT_PROVIDER === 'iyzico') {
    if (!env.IYZICO_API_KEY || !env.IYZICO_SECRET_KEY) {
      throw new Error('PAYMENT_PROVIDER=iyzico için IYZICO_API_KEY ve IYZICO_SECRET_KEY zorunludur.');
    }
    provider = new IyzicoPaymentProvider();
    return provider;
  }
  provider = new MockPaymentProvider();
  return provider;
}

/** Testler için sağlayıcıyı değiştirmeye izin verir. */
export function setPaymentProvider(p: PaymentProvider | null) {
  provider = p;
}

export type { PaymentProvider } from './payment-provider';
