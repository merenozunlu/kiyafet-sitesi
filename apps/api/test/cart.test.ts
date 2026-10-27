import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { CUSTOMER, auth, firstProductWithStock, getApp, login, resetDb } from './helpers';

describe('Sepet', () => {
  beforeEach(resetDb);

  it('misafir sepeti doğrulanır ve toplamlar sunucuda hesaplanır', async () => {
    const a = await getApp();
    const { product, variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/cart/validate')
      .send({ items: [{ variantId: variant.id, quantity: 2 }] });
    expect(res.status).toBe(200);
    const item = res.body.data.items[0];
    expect(item.id).toBe(variant.id);
    expect(item.productId).toBe(product.id);
    expect(item.lineTotalCents).toBe(item.unitPriceCents * 2);
    expect(res.body.data.summary.subtotalCents).toBe(item.lineTotalCents);
    expect(res.body.data.summary.totalCents).toBe(res.body.data.summary.subtotalCents + res.body.data.summary.shippingCents - res.body.data.summary.discountCents);
  });

  it('stoktan fazla adet istenince adet düşürülür ve uyarı verilir', async () => {
    const a = await getApp();
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/cart/validate')
      .send({ items: [{ variantId: variant.id, quantity: Math.min(20, variant.stockQuantity + 1) }] });
    expect(res.status).toBe(200);
    if (variant.stockQuantity < 20) {
      expect(res.body.data.items[0].quantity).toBe(variant.stockQuantity);
      expect(res.body.data.items[0].warning).toBe('QUANTITY_REDUCED');
    }
  });

  it('bilinmeyen varyant sepette görünmez', async () => {
    const a = await getApp();
    const res = await request(a)
      .post('/api/v1/cart/validate')
      .send({ items: [{ variantId: 'yok-boyle-bir-varyant', quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  it('kayıtlı kullanıcı sepete ekler, adet günceller, siler', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const { variant } = await firstProductWithStock();

    const add = await request(a).post('/api/v1/cart/items').set(auth(accessToken)).send({ variantId: variant.id, quantity: 1 });
    expect(add.status).toBe(200);
    expect(add.body.data.items).toHaveLength(1);
    const itemId = add.body.data.items[0].id;

    // Aynı varyant tekrar eklenince satır birleşir
    const addAgain = await request(a).post('/api/v1/cart/items').set(auth(accessToken)).send({ variantId: variant.id, quantity: 1 });
    expect(addAgain.body.data.items).toHaveLength(1);
    expect(addAgain.body.data.items[0].quantity).toBe(2);

    const upd = await request(a).patch(`/api/v1/cart/items/${itemId}`).set(auth(accessToken)).send({ quantity: 3 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.items[0].quantity).toBe(Math.min(3, variant.stockQuantity));

    const del = await request(a).delete(`/api/v1/cart/items/${itemId}`).set(auth(accessToken));
    expect(del.status).toBe(200);
    expect(del.body.data.items).toHaveLength(0);
  });

  it('sepete eklerken stoktan fazla adet stok sınırına çekilir, stoksuz varyant reddedilir', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const { variant } = await firstProductWithStock();
    const res = await request(a)
      .post('/api/v1/cart/items')
      .set(auth(accessToken))
      .send({ variantId: variant.id, quantity: Math.min(20, variant.stockQuantity + 1) });
    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBeLessThanOrEqual(variant.stockQuantity);

    // Stoksuz bir varyant bul
    const list = await request(a).get('/api/v1/products?pageSize=48');
    let outOfStockVariantId: string | null = null;
    for (const p of list.body.data) {
      const d = await request(a).get(`/api/v1/products/${p.id}`);
      const v = d.body.data.variants.find((x: { stockQuantity: number }) => x.stockQuantity === 0);
      if (v) {
        outOfStockVariantId = v.id;
        break;
      }
    }
    if (outOfStockVariantId) {
      const bad = await request(a).post('/api/v1/cart/items').set(auth(accessToken)).send({ variantId: outOfStockVariantId, quantity: 1 });
      expect(bad.status).toBe(409);
      expect(bad.body.error.code).toBe('OUT_OF_STOCK');
    }
  });

  it('merge: aynı varyant toplanır, stok sınırı aşılmaz', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const { variant } = await firstProductWithStock();
    await request(a).post('/api/v1/cart/items').set(auth(accessToken)).send({ variantId: variant.id, quantity: 1 });
    const merged = await request(a)
      .post('/api/v1/cart/merge')
      .set(auth(accessToken))
      .send({ items: [{ variantId: variant.id, quantity: 20 }] });
    expect(merged.status).toBe(200);
    expect(merged.body.data.items).toHaveLength(1);
    expect(merged.body.data.items[0].quantity).toBe(Math.min(21, variant.stockQuantity, 20));
  });

  it('kimliksiz kullanıcı /cart uç noktasına 401 alır', async () => {
    const a = await getApp();
    const res = await request(a).get('/api/v1/cart');
    expect(res.status).toBe(401);
  });
});

describe('Favoriler', () => {
  beforeEach(resetDb);

  it('favori ekler, listeler, siler, merge eder', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const { product } = await firstProductWithStock();
    const add = await request(a).post(`/api/v1/favorites/${product.id}`).set(auth(accessToken));
    expect([200, 201]).toContain(add.status);
    const list = await request(a).get('/api/v1/favorites').set(auth(accessToken));
    expect(list.body.data.some((p: { id: string }) => p.id === product.id)).toBe(true);
    const del = await request(a).delete(`/api/v1/favorites/${product.id}`).set(auth(accessToken));
    expect([200, 204]).toContain(del.status);
    const merge = await request(a).post('/api/v1/favorites/merge').set(auth(accessToken)).send({ productIds: [product.id, 'yok'] });
    expect(merge.status).toBe(200);
    expect(merge.body.data.some((p: { id: string }) => p.id === product.id)).toBe(true);
  });
});
