/** Ticari kurallar — tek yerden yapılandırılır. Tutarlar kuruş cinsindendir. */
export const commerceConfig = {
  /** Bu tutar ve üzeri sepetlerde kargo ücretsizdir. */
  freeShippingThresholdCents: 150_000, // 1.500,00 TL
  /** Eşik altı kargo ücreti. */
  shippingFeeCents: 7_990, // 79,90 TL
  /** Tek bir sepet satırında izin verilen en yüksek adet. */
  maxQuantityPerLine: 20,
  /** Yönetici panelinde "stok azalan" eşiği. */
  lowStockThreshold: 5,
  /** Havale/EFT talimatları (demo değerler). */
  bankTransfer: {
    bankName: 'Örnek Bank A.Ş.',
    iban: 'TR00 0000 0000 0000 0000 0000 00',
    accountHolder: 'Atölye Giyim Ltd. Şti.',
  },
  /** Sipariş numarası ön eki. */
  orderNumberPrefix: 'AT',
} as const;

export function calculateShippingCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return subtotalCents >= commerceConfig.freeShippingThresholdCents
    ? 0
    : commerceConfig.shippingFeeCents;
}
