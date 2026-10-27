import crypto from 'node:crypto';
import type { AddressSnapshot, CreateOrderInput, OrderDto, OrderStatus, PaymentStatus } from '@shop/shared';
import { CUSTOMER_CANCELLABLE_STATUSES, ORDER_STATUS_TRANSITIONS } from '@shop/shared';
import { commerceConfig } from '../../config/commerce';
import { db, type Database } from '../../shared/db';
import type { OrderItemEntity, OrderEntity, UserEntity } from '../../shared/db/entities';
import type { OrderWithRelations } from '../../shared/db/repositories';
import { AppError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { paginationMeta, toOrderDto, variantPriceCents } from '../../shared/mappers';
import { summarize } from '../cart/cart.service';
import { getPaymentProvider } from '../payments';
import type { AuthUser } from '../../middleware/auth';

async function generateOrderNumber(tx: Database): Promise<string> {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  for (let i = 0; i < 10; i++) {
    const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `${commerceConfig.orderNumberPrefix}-${ymd}-${rnd}`;
    if (!(await tx.orders.orderNumberExists(candidate))) return candidate;
  }
  throw new Error('Sipariş numarası üretilemedi');
}

async function customerFor(order: OrderEntity): Promise<Pick<UserEntity, 'id' | 'firstName' | 'lastName' | 'email'> | null> {
  if (!order.userId) return null;
  return db().users.findById(order.userId);
}

export async function orderToDto(order: OrderWithRelations): Promise<OrderDto> {
  return toOrderDto(order, await customerFor(order));
}

async function resolveShippingAddress(input: CreateOrderInput['shippingAddress'], user: AuthUser | null): Promise<AddressSnapshot> {
  if ('addressId' in input) {
    if (!user) throw AppError.validation('Kayıtlı adres kullanmak için giriş yapmalısınız');
    const a = await db().addresses.findById(input.addressId);
    if (!a || a.userId !== user.id) throw AppError.notFound('Adres bulunamadı');
    return { title: a.title, firstName: a.firstName, lastName: a.lastName, phone: a.phone, city: a.city, district: a.district, postalCode: a.postalCode, line: a.line };
  }
  return {
    title: input.title ?? 'Teslimat',
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    city: input.city,
    district: input.district,
    postalCode: input.postalCode ?? null,
    line: input.line,
  };
}

async function restoreStock(tx: Database, items: OrderItemEntity[]) {
  for (const it of items) {
    await tx.variants.incrementStock(it.variantId, it.quantity);
    await tx.products.incrementSales(it.productId, -it.quantity);
  }
}

export const ordersService = {
  /**
   * Sipariş oluşturma. Tüm doğrulama ve fiyatlandırma sunucuda yapılır; işlem
   * transaction/mutex içinde çalışır; Idempotency-Key ile mükerrer sipariş engellenir.
   */
  async create(input: CreateOrderInput, user: AuthUser | null, idempotencyKey: string): Promise<{ order: OrderDto; created: boolean }> {
    const scope = user ? `user:${user.id}` : `guest:${input.guestEmail ?? 'anon'}`;
    const existing = await db().idempotency.find(scope, idempotencyKey);
    if (existing) {
      const prev = await db().orders.findById(existing.orderId);
      if (prev) return { order: await orderToDto(prev), created: false };
    }

    if (!user && !input.guestEmail) throw AppError.validation('Misafir siparişi için e-posta zorunludur', [{ path: 'guestEmail', message: 'E-posta zorunludur' }]);

    const shippingAddress = await resolveShippingAddress(input.shippingAddress, user);
    const email = user ? user.email : input.guestEmail!;

    // Sepet satırlarını belirle: kullanıcı -> sunucu sepeti; misafir -> gövde
    let lines: { variantId: string; quantity: number }[];
    if (user) {
      const cart = await db().carts.getOrCreateByUser(user.id);
      lines = cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
    } else {
      const map = new Map<string, number>();
      for (const l of input.items ?? []) map.set(l.variantId, (map.get(l.variantId) ?? 0) + l.quantity);
      lines = [...map.entries()].map(([variantId, quantity]) => ({ variantId, quantity }));
    }
    if (lines.length === 0) throw AppError.validation('Sepetiniz boş');

    const result = await db().transaction(async (tx) => {
      // Yarış koşulu: aynı anahtarla eşzamanlı istek mutex içinde tekrar kontrol edilir
      const again = await tx.idempotency.find(scope, idempotencyKey);
      if (again) {
        const prev = await tx.orders.findById(again.orderId);
        if (prev) return { order: prev, created: false };
      }

      const variants = await tx.variants.findManyByIds(lines.map((l) => l.variantId));
      const products = await tx.products.findManyByIds([...new Set(variants.map((v) => v.productId))]);

      const problems: { path: string; message: string }[] = [];
      const items: Omit<OrderItemEntity, 'id' | 'orderId'>[] = [];
      for (const line of lines) {
        const variant = variants.find((v) => v.id === line.variantId);
        const product = variant && products.find((p) => p.id === variant.productId);
        if (!variant || !product || !variant.isActive || product.status !== 'ACTIVE' || product.deletedAt) {
          problems.push({ path: line.variantId, message: 'Ürün artık satışta değil' });
          continue;
        }
        if (line.quantity < 1 || line.quantity > commerceConfig.maxQuantityPerLine) {
          problems.push({ path: line.variantId, message: 'Geçersiz adet' });
          continue;
        }
        if (variant.stockQuantity < line.quantity) {
          problems.push({ path: line.variantId, message: `${product.name} (${variant.size}) için yeterli stok yok (kalan: ${variant.stockQuantity})` });
          continue;
        }
        const unit = variantPriceCents(product, variant);
        items.push({
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          productSlug: product.slug,
          variantSku: variant.sku,
          size: variant.size,
          color: variant.color,
          imageUrl: product.images[0]?.imageUrl ?? null,
          unitPriceCents: unit,
          quantity: line.quantity,
          lineTotalCents: unit * line.quantity,
        });
      }
      if (problems.length) throw AppError.outOfStock('Sepetinizdeki bazı ürünler için stok yetersiz', problems);

      // Toplamlar sunucuda hesaplanır
      const summary = summarize(
        items.map((i) => ({
          id: i.variantId,
          productId: i.productId,
          variantId: i.variantId,
          name: i.productName,
          slug: i.productSlug,
          imageUrl: i.imageUrl,
          size: i.size,
          color: i.color,
          unitPriceCents: i.unitPriceCents,
          quantity: i.quantity,
          lineTotalCents: i.lineTotalCents,
          stockQuantity: 0,
          warning: null,
        })),
      );

      // Stok düş (atomik, yetersizse geri al)
      const decremented: { variantId: string; quantity: number; productId: string }[] = [];
      for (const it of items) {
        const ok = await tx.variants.decrementStock(it.variantId, it.quantity);
        if (!ok) {
          for (const d of decremented) await tx.variants.incrementStock(d.variantId, d.quantity);
          throw AppError.outOfStock(`${it.productName} (${it.size}) için stok tükendi`, [{ path: it.variantId, message: 'Stok yetersiz' }]);
        }
        decremented.push({ variantId: it.variantId, quantity: it.quantity, productId: it.productId });
        await tx.products.incrementSales(it.productId, it.quantity);
      }

      const orderNumber = await generateOrderNumber(tx);
      const order = await tx.orders.create(
        {
          orderNumber,
          userId: user?.id ?? null,
          guestEmail: user ? null : email,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: input.paymentMethod,
          subtotalCents: summary.subtotalCents,
          discountCents: summary.discountCents,
          shippingCents: summary.shippingCents,
          totalCents: summary.totalCents,
          shippingAddress,
          note: input.note ?? null,
          trackingNumber: null,
          idempotencyKey,
        },
        items,
        { fromStatus: null, toStatus: 'PENDING', note: 'Sipariş oluşturuldu', trackingNumber: null, changedByUserId: user?.id ?? null },
      );

      const reference = `${orderNumber}`;
      let paymentStatus: PaymentStatus = 'PENDING';
      let providerPaymentId: string | null = null;
      let cardLast4: string | null = null;
      let failureReason: string | null = null;
      let providerName = input.paymentMethod === 'COD' ? 'cod' : input.paymentMethod === 'BANK_TRANSFER' ? 'bank_transfer' : getPaymentProvider().name;

      if (input.paymentMethod === 'CREDIT_CARD') {
        const provider = getPaymentProvider();
        providerName = provider.name;
        const init = await provider.initializePayment({
          orderId: order.id,
          orderNumber,
          amountCents: summary.totalCents,
          currency: 'TRY',
          buyer: { email, firstName: shippingAddress.firstName, lastName: shippingAddress.lastName, phone: shippingAddress.phone },
          card: input.card,
        });
        providerPaymentId = init.providerPaymentId;
        cardLast4 = init.cardLast4 ?? null;
        // Sağlayıcının yanıtına güvenmek yerine doğrula
        const verified = await provider.verifyPayment(init.providerPaymentId);
        paymentStatus = verified.status === 'PAID' ? 'PAID' : verified.status === 'FAILED' ? 'FAILED' : 'PENDING';
        failureReason = init.failureReason ?? null;
      }

      await tx.payments.create({
        orderId: order.id,
        provider: providerName,
        providerPaymentId,
        status: paymentStatus,
        amountCents: summary.totalCents,
        reference,
        cardLast4,
        processedEventIds: [],
        failureReason,
      });

      let finalOrder = order;
      if (paymentStatus === 'FAILED') {
        // Başarısız ödeme: sipariş iptal, stok iade
        await restoreStock(tx, order.items);
        finalOrder = await tx.orders.update(order.id, { status: 'CANCELLED', paymentStatus: 'FAILED' });
        await tx.orders.addStatusHistory({ orderId: order.id, fromStatus: 'PENDING', toStatus: 'CANCELLED', note: `Ödeme başarısız: ${failureReason ?? 'bilinmeyen neden'}`, trackingNumber: null, changedByUserId: null });
      } else if (paymentStatus === 'PAID') {
        finalOrder = await tx.orders.update(order.id, { status: 'CONFIRMED', paymentStatus: 'PAID' });
        await tx.orders.addStatusHistory({ orderId: order.id, fromStatus: 'PENDING', toStatus: 'CONFIRMED', note: 'Ödeme alındı', trackingNumber: null, changedByUserId: null });
      }

      await tx.idempotency.save({ scope, key: idempotencyKey, orderId: order.id });

      if (user && paymentStatus !== 'FAILED') {
        const cart = await tx.carts.getOrCreateByUser(user.id);
        await tx.carts.clear(cart.id);
      }

      const fresh = (await tx.orders.findById(finalOrder.id))!;
      return { order: fresh, created: true, failureReason: paymentStatus === 'FAILED' ? failureReason : null };
    });

    if ('failureReason' in result && result.failureReason) {
      throw new AppError(402, 'PAYMENT_FAILED', `Ödeme alınamadı: ${result.failureReason}`, [{ path: 'card', message: result.failureReason }]);
    }
    logger.info({ orderNumber: result.order.orderNumber, created: result.created }, 'Sipariş');
    return { order: await orderToDto(result.order), created: result.created };
  },

  async listForUser(userId: string, page: number, pageSize: number) {
    const { items, total } = await db().orders.query({ userId, page, pageSize });
    return { data: await Promise.all(items.map(orderToDto)), meta: paginationMeta(page, pageSize, total) };
  },

  async getForUser(userId: string, id: string): Promise<OrderDto> {
    const o = await db().orders.findById(id);
    if (!o || o.userId !== userId) throw AppError.notFound('Sipariş bulunamadı');
    return orderToDto(o);
  },

  async track(orderNumber: string, email: string): Promise<OrderDto> {
    const o = await db().orders.findByOrderNumber(orderNumber);
    if (!o) throw AppError.notFound('Sipariş bulunamadı');
    const ownerEmail = o.guestEmail ?? (o.userId ? (await db().users.findById(o.userId))?.email : null);
    if (!ownerEmail || ownerEmail.toLowerCase() !== email.toLowerCase()) throw AppError.notFound('Sipariş bulunamadı');
    return orderToDto(o);
  },

  async cancelByCustomer(userId: string, id: string, reason?: string): Promise<OrderDto> {
    const updated = await db().transaction(async (tx) => {
      const o = await tx.orders.findById(id);
      if (!o || o.userId !== userId) throw AppError.notFound('Sipariş bulunamadı');
      if (!CUSTOMER_CANCELLABLE_STATUSES.includes(o.status)) {
        throw AppError.invalidTransition('Bu sipariş artık iptal edilemez. Lütfen destek ile iletişime geçin.');
      }
      return this.transitionWithin(tx, o, 'CANCELLED', { note: reason ? `Müşteri iptali: ${reason}` : 'Müşteri tarafından iptal edildi', changedByUserId: userId });
    });
    return orderToDto(updated);
  },

  /** Durum makinesi: tüm geçişler buradan geçer. */
  async transitionWithin(
    tx: Database,
    o: OrderWithRelations,
    to: OrderStatus,
    opts: { note?: string | null; trackingNumber?: string | null; changedByUserId: string | null },
  ): Promise<OrderWithRelations> {
    const allowed = ORDER_STATUS_TRANSITIONS[o.status];
    if (!allowed.includes(to)) throw AppError.invalidTransition(`"${o.status}" durumundan "${to}" durumuna geçilemez`);
    if (to === 'SHIPPED' && !opts.trackingNumber && !o.trackingNumber) throw AppError.validation('Kargoya verildi durumu için takip numarası zorunludur', [{ path: 'trackingNumber', message: 'Zorunlu alan' }]);

    const patch: Partial<OrderEntity> = { status: to };
    if (opts.trackingNumber) patch.trackingNumber = opts.trackingNumber;

    if (to === 'CANCELLED' || to === 'RETURNED') {
      await restoreStock(tx, o.items);
      if (o.paymentStatus === 'PAID') {
        const payment = o.payment;
        if (payment?.providerPaymentId && payment.provider !== 'cod' && payment.provider !== 'bank_transfer') {
          const r = await getPaymentProvider().refundPayment(payment.providerPaymentId, payment.amountCents);
          if (r.status === 'REFUNDED') {
            await tx.payments.update(payment.id, { status: 'REFUNDED' });
            patch.paymentStatus = 'REFUNDED';
          }
        } else if (payment) {
          await tx.payments.update(payment.id, { status: 'REFUNDED' });
          patch.paymentStatus = 'REFUNDED';
        }
      }
    }

    await tx.orders.update(o.id, patch);
    await tx.orders.addStatusHistory({ orderId: o.id, fromStatus: o.status, toStatus: to, note: opts.note ?? null, trackingNumber: opts.trackingNumber ?? null, changedByUserId: opts.changedByUserId });
    return (await tx.orders.findById(o.id))!;
  },

  async adminUpdateStatus(id: string, to: OrderStatus, opts: { note?: string; trackingNumber?: string; adminId: string }): Promise<OrderDto> {
    const updated = await db().transaction(async (tx) => {
      const o = await tx.orders.findById(id);
      if (!o) throw AppError.notFound('Sipariş bulunamadı');
      return this.transitionWithin(tx, o, to, { note: opts.note ?? null, trackingNumber: opts.trackingNumber ?? null, changedByUserId: opts.adminId });
    });
    return orderToDto(updated);
  },

  async adminUpdatePaymentStatus(id: string, status: 'PAID' | 'FAILED' | 'REFUNDED', opts: { note?: string; adminId: string }): Promise<OrderDto> {
    const updated = await db().transaction(async (tx) => {
      const o = await tx.orders.findById(id);
      if (!o) throw AppError.notFound('Sipariş bulunamadı');
      if (o.paymentStatus === status) return o;
      if (o.payment) await tx.payments.update(o.payment.id, { status, failureReason: status === 'FAILED' ? (opts.note ?? 'Yönetici tarafından başarısız işaretlendi') : null });
      await tx.orders.update(o.id, { paymentStatus: status });
      // Havale onayı: PENDING siparişi otomatik onayla
      if (status === 'PAID' && o.status === 'PENDING') {
        return this.transitionWithin(tx, (await tx.orders.findById(o.id))!, 'CONFIRMED', { note: opts.note ?? 'Ödeme onaylandı', changedByUserId: opts.adminId });
      }
      return (await tx.orders.findById(o.id))!;
    });
    return orderToDto(updated);
  },

  /** Webhook / sağlayıcı sonucu: idempotent uygular. */
  async applyProviderEvent(event: { eventId: string; providerPaymentId: string; status: 'PAID' | 'FAILED' | 'PENDING' }): Promise<{ applied: boolean }> {
    return db().transaction(async (tx) => {
      const payment = await tx.payments.findByProviderPaymentId(event.providerPaymentId);
      if (!payment) throw AppError.notFound('Ödeme kaydı bulunamadı');
      if (payment.processedEventIds.includes(event.eventId)) return { applied: false };
      const o = await tx.orders.findById(payment.orderId);
      if (!o) throw AppError.notFound('Sipariş bulunamadı');

      await tx.payments.update(payment.id, { processedEventIds: [...payment.processedEventIds, event.eventId] });
      if (event.status === 'PENDING' || payment.status === event.status) return { applied: false };

      if (event.status === 'PAID' && payment.status !== 'PAID') {
        await tx.payments.update(payment.id, { status: 'PAID' });
        await tx.orders.update(o.id, { paymentStatus: 'PAID' });
        if (o.status === 'PENDING') await this.transitionWithin(tx, (await tx.orders.findById(o.id))!, 'CONFIRMED', { note: 'Ödeme sağlayıcı tarafından onaylandı', changedByUserId: null });
        return { applied: true };
      }
      if (event.status === 'FAILED' && payment.status === 'PENDING') {
        await tx.payments.update(payment.id, { status: 'FAILED' });
        await tx.orders.update(o.id, { paymentStatus: 'FAILED' });
        if (o.status === 'PENDING') await this.transitionWithin(tx, (await tx.orders.findById(o.id))!, 'CANCELLED', { note: 'Ödeme sağlayıcı tarafından reddedildi', changedByUserId: null });
        return { applied: true };
      }
      return { applied: false };
    });
  },
};
