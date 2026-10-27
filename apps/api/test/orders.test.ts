import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { db } from '../src/shared/db';
import { ADMIN, CUSTOMER, auth, firstProductWithStock, getApp, login, resetDb } from './helpers';

const address = { firstName: 'Ayşe', lastName: 'Yılmaz', phone: '05551234567', city: 'İstanbul', district: 'Kadıköy', postalCode: '34710', line: 'Moda Cad. No:1 D:2' };
const GOOD_CARD = { holderName: 'AYSE YILMAZ', number: '4111 1111 1111 1111', expMonth: 12, expYear: 2030, cvc: '123' };
const BAD_CARD = { ...GOOD_CARD, number: '4000 0000 0000 0002' };
const key = () => crypto.randomUUID();

async function variantStock(variantId: string, productId: string) {
  const a = await getApp();
  const res = await request(a).get(`/api/v1/products/${productId}`);
  return res.body.data.variants.find((v: { id: string }) => v.id === variantId).stockQuantity as number;
}

describe('Sipariş oluşturma', () => {
  beforeEach(resetDb);

  it('misafir kapıda ödeme siparişi oluşturur, stok düşer, takip çalışır', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const before = await variantStock(variant.id, product.id);
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.orderNumber).toMatch(/^AT-/);
    expect(order.status).toBe('PENDING');
    expect(order.paymentStatus).toBe('PENDING');
    expect(order.items[0].size).toBe(variant.size);
    expect(order.totalCents).toBe(order.subtotalCents - order.discountCents + order.shippingCents);
    expect(await variantStock(variant.id, product.id)).toBe(before - 1);

    const track = await request(a).get(`/api/v1/orders/track/${order.orderNumber}?email=misafir@example.com`);
    expect(track.status).toBe(200);
    const wrong = await request(a).get(`/api/v1/orders/track/${order.orderNumber}?email=baska@example.com`);
    expect(wrong.status).toBe(404);
  });

  it('Idempotency-Key olmadan 400 döner', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    expect(res.status).toBe(400);
  });

  it('aynı Idempotency-Key ile tekrar istek aynı siparişi döner, stok iki kez düşmez', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const before = await variantStock(variant.id, product.id);
    const k = key();
    const body = { items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' };
    const r1 = await request(a).post('/api/v1/orders').set('Idempotency-Key', k).send(body);
    const r2 = await request(a).post('/api/v1/orders').set('Idempotency-Key', k).send(body);
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(200);
    expect(r2.body.data.id).toBe(r1.body.data.id);
    expect(await variantStock(variant.id, product.id)).toBe(before - 1);
  });

  it('eşzamanlı aynı anahtarlı istekler tek sipariş üretir', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const before = await variantStock(variant.id, product.id);
    const k = key();
    const body = { items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' };
    const results = await Promise.all([1, 2, 3, 4].map(() => request(a).post('/api/v1/orders').set('Idempotency-Key', k).send(body)));
    const ids = new Set(results.map((r) => r.body.data.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(await variantStock(variant.id, product.id)).toBe(before - 1);
  });

  it('kredi kartı (mock) başarılı: sipariş CONFIRMED/PAID olur, kart verisi yanıtta yoktur', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'CREDIT_CARD', card: GOOD_CARD });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.payment.cardLast4).toBe('1111');
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('4111111111111111');
    expect(raw).not.toContain('"cvc"');
  });

  it('kredi kartı (mock) reddedilen kart: 402 PAYMENT_FAILED ve stok geri yüklenir', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const before = await variantStock(variant.id, product.id);
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'CREDIT_CARD', card: BAD_CARD });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('PAYMENT_FAILED');
    expect(await variantStock(variant.id, product.id)).toBe(before);
  });

  it('kredi kartı seçilip kart gönderilmezse VALIDATION_ERROR', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'CREDIT_CARD' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('havale siparişi banka bilgilerini içerir', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'BANK_TRANSFER' });
    expect(res.status).toBe(201);
    expect(res.body.data.payment.bankTransferInstructions).toBeTruthy();
    expect(res.body.data.payment.bankTransferInstructions.reference).toBe(res.body.data.orderNumber);
  });

  it('stok yetersizse OUT_OF_STOCK döner', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: Math.min(20, variant.stockQuantity + 1) }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    if (variant.stockQuantity < 20) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('OUT_OF_STOCK');
    }
  });

  it('eşzamanlı farklı siparişler stoğu eksiye düşüremez', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const stock = await variantStock(variant.id, product.id);
    const qty = Math.max(1, Math.ceil(stock / 2) + 1); // iki istek toplamı stoğu aşar
    const mk = () =>
      request(a)
        .post('/api/v1/orders')
        .set('Idempotency-Key', key())
        .send({ items: [{ variantId: variant.id, quantity: Math.min(qty, 20) }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    const [r1, r2] = await Promise.all([mk(), mk()]);
    const ok = [r1, r2].filter((r) => r.status === 201).length;
    expect(ok).toBeGreaterThanOrEqual(1);
    const after = await variantStock(variant.id, product.id);
    expect(after).toBeGreaterThanOrEqual(0);
    expect(after).toBe(stock - ok * Math.min(qty, 20));
  });

  it('kayıtlı kullanıcı sunucu sepetinden sipariş verir, sepet temizlenir, siparişlerimde görünür, iptal edebilir', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const { product, variant } = await firstProductWithStock();
    const before = await variantStock(variant.id, product.id);
    await request(a).post('/api/v1/cart/items').set(auth(accessToken)).send({ variantId: variant.id, quantity: 2 });

    const res = await request(a)
      .post('/api/v1/orders')
      .set(auth(accessToken))
      .set('Idempotency-Key', key())
      .send({ shippingAddress: address, paymentMethod: 'COD' });
    expect(res.status).toBe(201);
    expect(res.body.data.items[0].quantity).toBe(2);

    const cart = await request(a).get('/api/v1/cart').set(auth(accessToken));
    expect(cart.body.data.items).toHaveLength(0);

    const list = await request(a).get('/api/v1/orders').set(auth(accessToken));
    expect(list.body.data.some((o: { id: string }) => o.id === res.body.data.id)).toBe(true);

    const cancel = await request(a).post(`/api/v1/orders/${res.body.data.id}/cancel`).set(auth(accessToken)).send({ reason: 'Vazgeçtim' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('CANCELLED');
    expect(await variantStock(variant.id, product.id)).toBe(before);

    const again = await request(a).post(`/api/v1/orders/${res.body.data.id}/cancel`).set(auth(accessToken)).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('başka kullanıcının siparişine erişim 404', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const get = await request(a).get(`/api/v1/orders/${res.body.data.id}`).set(auth(accessToken));
    expect(get.status).toBe(404);
  });
});

describe('Webhook', () => {
  beforeEach(resetDb);

  it('geçersiz imza 401, geçerli imza idempotent uygulanır', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const order = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'CREDIT_CARD', card: GOOD_CARD });
    // providerPaymentId istemciye dönülmez; test doğrudan depodan okur
    expect(JSON.stringify(order.body)).not.toContain('providerPaymentId');
    const payment = await db().payments.findByOrderId(order.body.data.id);
    const providerPaymentId = payment!.providerPaymentId!;
    const payload = JSON.stringify({ eventId: 'evt-1', providerPaymentId, status: 'PAID' });
    const bad = await request(a).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Mock-Signature', 'kotu').send(payload);
    expect(bad.status).toBe(401);
    const sig = crypto.createHmac('sha256', process.env.MOCK_WEBHOOK_SECRET ?? 'mock-webhook-secret').update(payload).digest('hex');
    const ok1 = await request(a).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Mock-Signature', sig).send(payload);
    expect(ok1.status).toBe(200);
    const ok2 = await request(a).post('/api/v1/payments/webhook').set('Content-Type', 'application/json').set('X-Mock-Signature', sig).send(payload);
    expect(ok2.status).toBe(200);
    expect(ok2.body.applied).toBe(false);
  });
});

describe('Admin sipariş yönetimi', () => {
  beforeEach(resetDb);

  it('durum makinesi: geçerli geçişler çalışır, geçersiz geçiş 409, SHIPPED takip no ister', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const created = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'COD' });
    const id = created.body.data.id;
    const ad = await login(ADMIN.email, ADMIN.password);

    const invalid = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'DELIVERED' });
    expect(invalid.status).toBe(409);
    expect(invalid.body.error.code).toBe('INVALID_STATE_TRANSITION');

    const confirm = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'CONFIRMED' });
    expect(confirm.status).toBe(200);
    const prep = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'PREPARING' });
    expect(prep.status).toBe(200);

    const noTrack = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'SHIPPED' });
    expect(noTrack.status).toBe(400);
    const shipped = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'SHIPPED', trackingNumber: 'TR123456' });
    expect(shipped.status).toBe(200);
    expect(shipped.body.data.trackingNumber).toBe('TR123456');
    expect(shipped.body.data.statusHistory.length).toBeGreaterThanOrEqual(4);

    const delivered = await request(a).patch(`/api/v1/admin/orders/${id}/status`).set(auth(ad.accessToken)).send({ status: 'DELIVERED' });
    expect(delivered.status).toBe(200);

    const logs = await request(a).get('/api/v1/admin/audit-logs').set(auth(ad.accessToken));
    expect(logs.status).toBe(200);
    expect(logs.body.data.some((l: { action: string }) => l.action === 'order.status')).toBe(true);
  });

  it('havale ödemesi onaylanınca sipariş CONFIRMED olur', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const created = await request(a)
      .post('/api/v1/orders')
      .set('Idempotency-Key', key())
      .send({ items: [{ variantId: variant.id, quantity: 1 }], guestEmail: 'misafir@example.com', shippingAddress: address, paymentMethod: 'BANK_TRANSFER' });
    const ad = await login(ADMIN.email, ADMIN.password);
    const res = await request(a).patch(`/api/v1/admin/orders/${created.body.data.id}/payment-status`).set(auth(ad.accessToken)).send({ paymentStatus: 'PAID' });
    expect(res.status).toBe(200);
    expect(res.body.data.paymentStatus).toBe('PAID');
    expect(res.body.data.status).toBe('CONFIRMED');
  });
});
