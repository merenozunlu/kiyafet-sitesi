import type {
  AddressSnapshot,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  Size,
  UserRole,
} from '@shop/shared';

export interface UserEntity {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefreshTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface PasswordResetTokenEntity {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface AddressEntity {
  id: string;
  userId: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  postalCode: string | null;
  line: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  categoryId: string;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  salesCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImageEntity {
  id: string;
  productId: string;
  imageUrl: string;
  altText: string;
  sortOrder: number;
}

export interface ProductVariantEntity {
  id: string;
  productId: string;
  sku: string;
  size: Size;
  color: string;
  colorHex: string | null;
  stockQuantity: number;
  priceOverrideCents: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartEntity {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemEntity {
  id: string;
  cartId: string;
  productId: string;
  variantId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FavoriteEntity {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

export interface OrderEntity {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestEmail: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: AddressSnapshot;
  note: string | null;
  trackingNumber: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemEntity {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  productName: string;
  productSlug: string;
  variantSku: string;
  size: Size;
  color: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

export interface PaymentEntity {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  amountCents: number;
  reference: string;
  cardLast4: string | null;
  processedEventIds: string[];
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderStatusHistoryEntity {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  trackingNumber: string | null;
  changedByUserId: string | null;
  createdAt: Date;
}

export interface AuditLogEntity {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface IdempotencyRecordEntity {
  key: string;
  scope: string;
  orderId: string;
  createdAt: Date;
}
