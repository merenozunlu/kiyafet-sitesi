/** Tüm tutarlar kuruş cinsinden tam sayı olarak tutulur. */

export function formatCents(cents: number, options?: { withSymbol?: boolean }): string {
  const withSymbol = options?.withSymbol ?? true;
  const formatter = new Intl.NumberFormat('tr-TR', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(cents / 100);
}

export function liraToCents(lira: number): number {
  return Math.round(lira * 100);
}

export function centsToLira(cents: number): number {
  return cents / 100;
}

export function discountPercent(priceCents: number, compareAtPriceCents: number | null): number | null {
  if (!compareAtPriceCents || compareAtPriceCents <= priceCents) return null;
  return Math.round(((compareAtPriceCents - priceCents) / compareAtPriceCents) * 100);
}
