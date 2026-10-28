import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { getApp, resetDb } from './helpers';

describe('Ürün kataloğu', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('health endpoint veri kaynağını döner', async () => {
    const res = await request(await getApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.dataSource).toBe('prisma');
  });

  it('ürünleri sayfalı listeler ve facet döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products?pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.total).toBeGreaterThan(20);
    expect(res.body.facets.sizes).toContain('M');
    expect(res.body.facets.priceRange.minCents).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(first).toHaveProperty('priceCents');
    expect(first.image).toBeTruthy();
  });

  it('kategoriye göre filtreler', async () => {
    const res = await request(await getApp()).get('/api/v1/products?category=elbise');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const p of res.body.data) expect(p.category.slug).toBe('elbise');
  });

  it('fiyat aralığı ve sıralama uygular', async () => {
    const res = await request(await getApp()).get('/api/v1/products?minPrice=100&maxPrice=200&sort=price_asc&pageSize=48');
    expect(res.status).toBe(200);
    const prices = res.body.data.map((p: { priceCents: number }) => p.priceCents);
    for (const p of prices) {
      expect(p).toBeGreaterThanOrEqual(10_000);
      expect(p).toBeLessThanOrEqual(20_000);
    }
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  it('indirimli ürünleri filtreler', async () => {
    const res = await request(await getApp()).get('/api/v1/products?onSale=true&pageSize=48');
    expect(res.status).toBe(200);
    for (const p of res.body.data) expect(p.discountPercent).toBeGreaterThan(0);
  });

  it('beden filtresi yalnızca stoklu bedeni olan ürünleri döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products?size=XXL&pageSize=48');
    expect(res.status).toBe(200);
    for (const p of res.body.data) expect(p.availableSizes).toContain('XXL');
  });

  it('geçersiz sayfa boyutunu reddeder', async () => {
    const res = await request(await getApp()).get('/api/v1/products?pageSize=500');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('slug ile ürün detayını varyantlarıyla döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products/slug/organik-pamuk-basic-tisort-beyaz');
    expect(res.status).toBe(200);
    expect(res.body.data.variants.length).toBeGreaterThan(0);
    expect(res.body.data.images.length).toBeGreaterThan(0);
    expect(res.body.data.variants[0]).toHaveProperty('stockQuantity');
  });

  it('olmayan ürün için 404 döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products/slug/yok-boyle-bir-urun');
    expect(res.status).toBe(404);
  });

  it('canlı arama ürün ve kategori döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products/search?q=gömlek');
    expect(res.status).toBe(200);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.categories.some((c: { slug: string }) => c.slug === 'gomlek')).toBe(true);
  });

  it('arama için en az 2 karakter ister', async () => {
    const res = await request(await getApp()).get('/api/v1/products/search?q=a');
    expect(res.status).toBe(400);
  });

  it('kategorileri ürün sayısıyla listeler', async () => {
    const res = await request(await getApp()).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    expect(res.body.data[0].productCount).toBeGreaterThan(0);
  });

  it('ana sayfa koleksiyonlarını döner', async () => {
    const res = await request(await getApp()).get('/api/v1/products/home');
    expect(res.status).toBe(200);
    expect(res.body.data.newArrivals.length).toBeGreaterThan(0);
    expect(res.body.data.bestSellers.length).toBeGreaterThan(0);
    expect(res.body.data.onSale.length).toBeGreaterThan(0);
  });
});
