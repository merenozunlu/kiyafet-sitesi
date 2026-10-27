import type { CartDto, CartItemDto, CartItemWarning, CartLineInput } from '@shop/shared';
import { commerceConfig, calculateShippingCents } from '../../config/commerce';
import { db } from '../../shared/db';
import { AppError } from '../../shared/errors';
import { variantPriceCents } from '../../shared/mappers';

interface PricedLine {
  id: string;
  variantId: string;
  requestedQuantity: number;
  dto: CartItemDto | null;
}

/**
 * Sepet satırlarını sunucu tarafında fiyatlandırır ve doğrular.
 * Frontend'den gelen fiyatlara asla güvenilmez.
 */
export async function priceLines(lines: { id: string; variantId: string; quantity: number }[]): Promise<{ items: CartItemDto[]; warnings: string[]; priced: PricedLine[] }> {
  const variants = await db().variants.findManyByIds(lines.map((l) => l.variantId));
  const products = await db().products.findManyByIds([...new Set(variants.map((v) => v.productId))]);
  const items: CartItemDto[] = [];
  const warnings: string[] = [];
  const priced: PricedLine[] = [];

  for (const line of lines) {
    const variant = variants.find((v) => v.id === line.variantId);
    const product = variant ? products.find((p) => p.id === variant.productId) : undefined;
    if (!variant || !product) {
      warnings.push('Sepetinizdeki bir ürün artık mevcut değil ve kaldırıldı.');
      priced.push({ id: line.id, variantId: line.variantId, requestedQuantity: line.quantity, dto: null });
      continue;
    }
    const inactive = !variant.isActive || product.status !== 'ACTIVE' || !!product.deletedAt;
    let warning: CartItemWarning | null = null;
    let quantity = line.quantity;
    if (inactive) {
      warning = 'INACTIVE';
      warnings.push(`${product.name} artık satışta değil.`);
    } else if (variant.stockQuantity <= 0) {
      warning = 'OUT_OF_STOCK';
      warnings.push(`${product.name} (${variant.size}, ${variant.color}) tükendi.`);
    } else if (quantity > variant.stockQuantity) {
      quantity = variant.stockQuantity;
      warning = 'QUANTITY_REDUCED';
      warnings.push(`${product.name} (${variant.size}) için adet stok nedeniyle ${quantity} olarak güncellendi.`);
    }
    quantity = Math.min(quantity, commerceConfig.maxQuantityPerLine);
    const unitPriceCents = variantPriceCents(product, variant);
    const dto: CartItemDto = {
      id: line.id,
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images[0]?.imageUrl ?? null,
      size: variant.size,
      color: variant.color,
      unitPriceCents,
      quantity,
      lineTotalCents: warning === 'OUT_OF_STOCK' || warning === 'INACTIVE' ? 0 : unitPriceCents * quantity,
      stockQuantity: variant.stockQuantity,
      warning,
    };
    items.push(dto);
    priced.push({ id: line.id, variantId: line.variantId, requestedQuantity: line.quantity, dto });
  }
  return { items, warnings, priced };
}

export function summarize(items: CartItemDto[]): CartDto['summary'] {
  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const discountCents = 0; // Kupon/indirim politikası tanımlı değil; 0 gösterilir.
  const shippingCents = calculateShippingCents(subtotalCents - discountCents);
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    freeShippingThresholdCents: commerceConfig.freeShippingThresholdCents,
    itemCount: items.filter((i) => i.warning !== 'OUT_OF_STOCK' && i.warning !== 'INACTIVE').reduce((n, i) => n + i.quantity, 0),
  };
}

export const cartService = {
  /** Misafir sepeti: satırlar istemciden gelir, kalıcı değildir. id = variantId. */
  async validateGuest(lines: CartLineInput[]): Promise<CartDto> {
    const merged = mergeLines(lines);
    const { items, warnings } = await priceLines(merged.map((l) => ({ id: l.variantId, ...l })));
    return { items, summary: summarize(items), warnings };
  },

  async getForUser(userId: string): Promise<CartDto> {
    const cart = await db().carts.getOrCreateByUser(userId);
    const { items, warnings, priced } = await priceLines(cart.items.map((i) => ({ id: i.id, variantId: i.variantId, quantity: i.quantity })));
    // Silinmiş varyantları ve stok nedeniyle azaltılan adetleri sepette kalıcı olarak düzelt
    for (const p of priced) {
      if (!p.dto) await db().carts.removeItem(p.id);
      else if (p.dto.warning === 'QUANTITY_REDUCED' && p.dto.quantity !== p.requestedQuantity) await db().carts.updateItemQuantity(p.id, p.dto.quantity);
    }
    return { items, summary: summarize(items), warnings };
  },

  async addItem(userId: string, input: CartLineInput): Promise<CartDto> {
    const variant = await db().variants.findById(input.variantId);
    if (!variant || !variant.isActive) throw AppError.notFound('Ürün varyantı bulunamadı');
    const product = await db().products.findById(variant.productId);
    if (!product || product.status !== 'ACTIVE') throw AppError.notFound('Ürün satışta değil');
    if (variant.stockQuantity <= 0) throw AppError.outOfStock('Bu beden şu anda stokta yok');

    const cart = await db().carts.getOrCreateByUser(userId);
    const existing = await db().carts.findItemByVariant(cart.id, variant.id);
    const requested = (existing?.quantity ?? 0) + input.quantity;
    const quantity = Math.min(requested, variant.stockQuantity, commerceConfig.maxQuantityPerLine);
    if (existing) await db().carts.updateItemQuantity(existing.id, quantity);
    else await db().carts.addItem(cart.id, { productId: product.id, variantId: variant.id, quantity });
    const dto = await this.getForUser(userId);
    if (quantity < requested) {
      dto.warnings.unshift(`Bu ürün için en fazla ${quantity} adet ekleyebilirsiniz.`);
      const line = dto.items.find((i) => i.variantId === variant.id);
      if (line && !line.warning) line.warning = 'QUANTITY_REDUCED';
    }
    return dto;
  },

  async updateItem(userId: string, itemId: string, quantity: number): Promise<CartDto> {
    const cart = await db().carts.getOrCreateByUser(userId);
    const item = await db().carts.findItem(cart.id, itemId);
    if (!item) throw AppError.notFound('Sepet satırı bulunamadı');
    const variant = await db().variants.findById(item.variantId);
    if (!variant) throw AppError.notFound('Ürün varyantı bulunamadı');
    if (quantity > variant.stockQuantity) {
      throw AppError.outOfStock(`Bu ürün için en fazla ${variant.stockQuantity} adet ekleyebilirsiniz.`, [{ path: 'quantity', message: `En fazla ${variant.stockQuantity}` }]);
    }
    await db().carts.updateItemQuantity(item.id, Math.min(quantity, commerceConfig.maxQuantityPerLine));
    return this.getForUser(userId);
  },

  async removeItem(userId: string, itemId: string): Promise<CartDto> {
    const cart = await db().carts.getOrCreateByUser(userId);
    const item = await db().carts.findItem(cart.id, itemId);
    if (item) await db().carts.removeItem(item.id);
    return this.getForUser(userId);
  },

  async clear(userId: string): Promise<CartDto> {
    const cart = await db().carts.getOrCreateByUser(userId);
    await db().carts.clear(cart.id);
    return this.getForUser(userId);
  },

  /**
   * Misafir sepetini kullanıcı sepetiyle birleştirir.
   * Politika: aynı varyant -> adetler toplanır ve stokla sınırlanır; farklı varyantlar ayrı satır kalır;
   * stokta olmayan/pasif satırlar eklenmez ve uyarı döner.
   */
  async merge(userId: string, lines: CartLineInput[]): Promise<CartDto> {
    const cart = await db().carts.getOrCreateByUser(userId);
    const merged = mergeLines(lines);
    const variants = await db().variants.findManyByIds(merged.map((l) => l.variantId));
    const products = await db().products.findManyByIds([...new Set(variants.map((v) => v.productId))]);
    const skipped: string[] = [];
    for (const line of merged) {
      const variant = variants.find((v) => v.id === line.variantId);
      const product = variant && products.find((p) => p.id === variant.productId);
      if (!variant || !product || !variant.isActive || product.status !== 'ACTIVE' || variant.stockQuantity <= 0) {
        if (product) skipped.push(product.name);
        continue;
      }
      const existing = await db().carts.findItemByVariant(cart.id, variant.id);
      const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, variant.stockQuantity, commerceConfig.maxQuantityPerLine);
      if (existing) await db().carts.updateItemQuantity(existing.id, quantity);
      else await db().carts.addItem(cart.id, { productId: product.id, variantId: variant.id, quantity });
    }
    const dto = await this.getForUser(userId);
    if (skipped.length) dto.warnings.unshift(`Stokta olmadığı için eklenemeyen ürünler: ${skipped.join(', ')}`);
    return dto;
  },
};

function mergeLines(lines: CartLineInput[]): CartLineInput[] {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.quantity);
  return [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity: Math.min(quantity, commerceConfig.maxQuantityPerLine) }));
}
