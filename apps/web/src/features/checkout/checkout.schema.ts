import { z } from 'zod';
import { addressInputSchema, cardInputSchema, emailSchema, PAYMENT_METHODS } from '@shop/shared';

/** Checkout formu: tüm adımlar tek bir form state'inde tutulur; adım bazlı doğrulanır. */
export const checkoutAddressSchema = addressInputSchema.omit({ isDefault: true }).extend({ title: z.string().trim().max(40).optional() });

export const checkoutSchema = z.object({
  guestEmail: z.string().optional(),
  addressMode: z.enum(['saved', 'new']),
  addressId: z.string().optional(),
  address: checkoutAddressSchema.partial().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  card: cardInputSchema.partial().optional(),
  note: z.string().trim().max(300).optional(),
});
export type CheckoutFormValues = z.input<typeof checkoutSchema>;

/** Adım 1 doğrulaması (teslimat). */
export function validateShippingStep(values: CheckoutFormValues, isGuest: boolean) {
  const issues: { path: string; message: string }[] = [];
  if (isGuest) {
    const r = emailSchema.safeParse(values.guestEmail ?? '');
    if (!r.success) issues.push({ path: 'guestEmail', message: r.error.issues[0]?.message ?? 'Geçerli bir e-posta girin' });
  }
  if (values.addressMode === 'saved') {
    if (!values.addressId) issues.push({ path: 'addressId', message: 'Bir teslimat adresi seçin' });
  } else {
    const r = checkoutAddressSchema.safeParse(values.address ?? {});
    if (!r.success) for (const i of r.error.issues) issues.push({ path: `address.${i.path.join('.')}`, message: i.message });
  }
  return issues;
}

/** Adım 2 doğrulaması (ödeme). */
export function validatePaymentStep(values: CheckoutFormValues) {
  const issues: { path: string; message: string }[] = [];
  if (!values.paymentMethod) issues.push({ path: 'paymentMethod', message: 'Ödeme yöntemi seçin' });
  if (values.paymentMethod === 'CREDIT_CARD') {
    const r = cardInputSchema.safeParse(values.card ?? {});
    if (!r.success) for (const i of r.error.issues) issues.push({ path: `card.${i.path.join('.')}`, message: i.message });
    else {
      const now = new Date();
      const { expMonth, expYear } = r.data;
      if (expYear < now.getFullYear() || (expYear === now.getFullYear() && expMonth < now.getMonth() + 1)) {
        issues.push({ path: 'card.expYear', message: 'Kartın süresi dolmuş' });
      }
    }
  }
  return issues;
}
