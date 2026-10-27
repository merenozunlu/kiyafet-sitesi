import type {
  AddressDto,
  AuditLogDto,
  CategoryDto,
  OrderDto,
  ProductDetailDto,
  ProductImageDto,
  ProductListItemDto,
  ProductVariantDto,
  UserDto,
} from '@shop/shared';
import { discountPercent, SIZES } from '@shop/shared';
import type {
  AddressEntity,
  AuditLogEntity,
  CategoryEntity,
  ProductImageEntity,
  ProductVariantEntity,
  UserEntity,
} from './db/entities';
import type { OrderWithRelations, ProductWithRelations } from './db/repositories';
import { commerceConfig } from '../config/commerce';

export function toUserDto(u: UserEntity): UserDto {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}

export function toCategoryDto(c: CategoryEntity, productCount?: number): CategoryDto {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
    ...(productCount !== undefined ? { productCount } : {}),
  };
}

export function toImageDto(i: ProductImageEntity): ProductImageDto {
  return { id: i.id, imageUrl: i.imageUrl, altText: i.altText, sortOrder: i.sortOrder };
}

export function variantPriceCents(p: { priceCents: number }, v: ProductVariantEntity): number {
  return v.priceOverrideCents ?? p.priceCents;
}

export function toVariantDto(p: { priceCents: number }, v: ProductVariantEntity): ProductVariantDto {
  return {
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    stockQuantity: v.stockQuantity,
    priceCents: variantPriceCents(p, v),
    isActive: v.isActive,
  };
}

export function toProductListItemDto(p: ProductWithRelations, category: CategoryEntity): ProductListItemDto {
  const active = p.variants.filter((v) => v.isActive);
  const sizes = new Set(active.filter((v) => v.stockQuantity > 0).map((v) => v.size));
  const colorMap = new Map<string, { name: string; hex: string | null }>();
  for (const v of active) if (!colorMap.has(v.color)) colorMap.set(v.color, { name: v.color, hex: v.colorHex });
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    priceCents: p.priceCents,
    compareAtPriceCents: p.compareAtPriceCents,
    discountPercent: discountPercent(p.priceCents, p.compareAtPriceCents),
    category: { id: category.id, name: category.name, slug: category.slug },
    image: p.images[0] ? toImageDto(p.images[0]) : null,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    inStock: active.some((v) => v.stockQuantity > 0),
    availableSizes: SIZES.filter((s) => sizes.has(s)),
    colors: [...colorMap.values()],
    createdAt: p.createdAt.toISOString(),
  };
}

export function toProductDetailDto(p: ProductWithRelations, category: CategoryEntity): ProductDetailDto {
  return {
    ...toProductListItemDto(p, category),
    description: p.description,
    images: p.images.map(toImageDto),
    variants: p.variants.map((v) => toVariantDto(p, v)),
    status: p.status,
    categoryId: p.categoryId,
  };
}

export function toAddressDto(a: AddressEntity): AddressDto {
  return {
    id: a.id,
    title: a.title,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phone,
    city: a.city,
    district: a.district,
    postalCode: a.postalCode,
    line: a.line,
    isDefault: a.isDefault,
  };
}

export function toOrderDto(
  o: OrderWithRelations,
  customer?: Pick<UserEntity, 'id' | 'firstName' | 'lastName' | 'email'> | null,
): OrderDto {
  const payment = o.payment;
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    subtotalCents: o.subtotalCents,
    discountCents: o.discountCents,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    shippingAddress: o.shippingAddress,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      productSlug: i.productSlug,
      variantSku: i.variantSku,
      size: i.size,
      color: i.color,
      imageUrl: i.imageUrl,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    })),
    statusHistory: o.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      trackingNumber: h.trackingNumber,
      createdAt: h.createdAt.toISOString(),
    })),
    payment: payment
      ? {
          provider: payment.provider,
          reference: payment.reference,
          status: payment.status,
          cardLast4: payment.cardLast4,
          bankTransferInstructions:
            o.paymentMethod === 'BANK_TRANSFER'
              ? { ...commerceConfig.bankTransfer, reference: payment.reference }
              : null,
        }
      : null,
    trackingNumber: o.trackingNumber,
    note: o.note,
    customerEmail: customer?.email ?? o.guestEmail ?? '',
    customer: customer
      ? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, email: customer.email }
      : o.guestEmail
        ? { id: null, firstName: o.shippingAddress.firstName, lastName: o.shippingAddress.lastName, email: o.guestEmail }
        : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function toAuditLogDto(l: AuditLogEntity, actorEmail: string | null): AuditLogDto {
  return {
    id: l.id,
    actorUserId: l.actorUserId,
    actorEmail,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
  };
}

export function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
