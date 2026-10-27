export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export const USER_ROLES = ['CUSTOMER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ['CREDIT_CARD', 'COD', 'BANK_TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRODUCT_SORTS = ['recommended', 'newest', 'price_asc', 'price_desc', 'discount'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Beklemede',
  CONFIRMED: 'Onaylandı',
  PREPARING: 'Hazırlanıyor',
  SHIPPED: 'Kargoya Verildi',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal Edildi',
  RETURNED: 'İade Edildi',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Ödeme Bekleniyor',
  PAID: 'Ödendi',
  FAILED: 'Başarısız',
  REFUNDED: 'İade Edildi',
  PARTIALLY_REFUNDED: 'Kısmi İade',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CREDIT_CARD: 'Kredi / Banka Kartı',
  COD: 'Kapıda Ödeme',
  BANK_TRANSFER: 'Havale / EFT',
};

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  recommended: 'Önerilen',
  newest: 'En Yeni',
  price_asc: 'Fiyat (Artan)',
  price_desc: 'Fiyat (Azalan)',
  discount: 'İndirim Oranı',
};

/** Geçerli sipariş durumu geçişleri (tek doğruluk kaynağı). */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

export const CUSTOMER_CANCELLABLE_STATUSES: readonly OrderStatus[] = ['PENDING', 'CONFIRMED'];
