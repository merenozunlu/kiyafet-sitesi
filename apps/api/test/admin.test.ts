import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ADMIN, CUSTOMER, auth, getApp, login, resetDb } from './helpers';

describe('Admin ürün ve kategori yönetimi', () => {
  beforeEach(resetDb);

  it('müşteri admin ürün uçlarına erişemez', async () => {
    const a = await getApp();
    const c = await login(CUSTOMER.email, CUSTOMER.password);
    const res = await request(a).get('/api/v1/admin/products').set(auth(c.accessToken));
    expect(res.status).toBe(403);
    const anon = await request(a).get('/api/v1/admin/products');
    expect(anon.status).toBe(401);
  });

  it('ürün oluşturur, günceller, varyant senkronlar, arşivler', async () => {
    const a = await getApp();
    const ad = await login(ADMIN.email, ADMIN.password);
    const cats = await request(a).get('/api/v1/admin/categories').set(auth(ad.accessToken));
    const categoryId = cats.body.data[0].id;

    const create = await request(a)
      .post('/api/v1/admin/products')
      .set(auth(ad.accessToken))
      .send({
        name: 'Test Keten Gömlek',
        description: 'Test amaçlı oluşturulan keten gömlek açıklaması.',
        priceCents: 129900,
        compareAtPriceCents: 159900,
        categoryId,
        status: 'ACTIVE',
        isNew: true,
        images: [{ imageUrl: 'https://images.unsplash.com/photo-1?w=800', altText: 'Test' }],
        variants: [
          { size: 'M', color: 'Beyaz', colorHex: '#ffffff', stockQuantity: 5 },
          { size: 'L', color: 'Beyaz', colorHex: '#ffffff', stockQuantity: 0 },
        ],
      });
    expect(create.status).toBe(201);
    const product = create.body.data;
    expect(product.slug).toBe('test-keten-gomlek');
    expect(product.variants).toHaveLength(2);
    expect(product.variants[0].sku).toBeTruthy();

    // Public listede görünür
    const pub = await request(a).get(`/api/v1/products/slug/${product.slug}`);
    expect(pub.status).toBe(200);

    // Güncelle: fiyat + varyant sync (biri silinir, biri güncellenir, biri eklenir)
    const keep = product.variants[0];
    const update = await request(a)
      .patch(`/api/v1/admin/products/${product.id}`)
      .set(auth(ad.accessToken))
      .send({
        priceCents: 119900,
        variants: [
          { id: keep.id, size: keep.size, color: keep.color, stockQuantity: 9, isActive: true },
          { size: 'XL', color: 'Beyaz', stockQuantity: 3, isActive: true },
        ],
      });
    expect(update.status).toBe(200);
    expect(update.body.data.priceCents).toBe(119900);
    expect(update.body.data.variants).toHaveLength(2);
    expect(update.body.data.variants.find((v: { id: string }) => v.id === keep.id).stockQuantity).toBe(9);

    // Geçersiz: önceki fiyat güncel fiyattan küçük
    const bad = await request(a).patch(`/api/v1/admin/products/${product.id}`).set(auth(ad.accessToken)).send({ compareAtPriceCents: 1000 });
    expect(bad.status).toBe(400);

    // Arşivle (soft delete) -> public'te görünmez, admin'de ARCHIVED filtresiyle görünür
    const del = await request(a).delete(`/api/v1/admin/products/${product.id}`).set(auth(ad.accessToken));
    expect(del.status).toBe(204);
    const gone = await request(a).get(`/api/v1/products/slug/${product.slug}`);
    expect(gone.status).toBe(404);
    const archived = await request(a).get('/api/v1/admin/products?status=ARCHIVED').set(auth(ad.accessToken));
    expect(archived.body.data.some((p: { id: string }) => p.id === product.id)).toBe(true);

    const logs = await request(a).get('/api/v1/admin/audit-logs').set(auth(ad.accessToken));
    const actions = logs.body.data.map((l: { action: string }) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['product.create', 'product.update', 'product.archive']));
  });

  it('aynı beden+renk kombinasyonu reddedilir', async () => {
    const a = await getApp();
    const ad = await login(ADMIN.email, ADMIN.password);
    const cats = await request(a).get('/api/v1/admin/categories').set(auth(ad.accessToken));
    const res = await request(a)
      .post('/api/v1/admin/products')
      .set(auth(ad.accessToken))
      .send({
        name: 'Tekrar Varyant',
        description: 'Aynı beden ve renk iki kez tanımlanmış ürün.',
        priceCents: 10000,
        categoryId: cats.body.data[0].id,
        variants: [
          { size: 'M', color: 'Siyah', stockQuantity: 1 },
          { size: 'M', color: 'siyah', stockQuantity: 1 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('kategori CRUD; ürünü olan kategori silinemez', async () => {
    const a = await getApp();
    const ad = await login(ADMIN.email, ADMIN.password);
    const create = await request(a).post('/api/v1/admin/categories').set(auth(ad.accessToken)).send({ name: 'Aksesuar', isActive: true, sortOrder: 9 });
    expect(create.status).toBe(201);
    expect(create.body.data.slug).toBe('aksesuar');
    const dup = await request(a).post('/api/v1/admin/categories').set(auth(ad.accessToken)).send({ name: 'Aksesuar' });
    expect(dup.status).toBe(409);
    const upd = await request(a).patch(`/api/v1/admin/categories/${create.body.data.id}`).set(auth(ad.accessToken)).send({ name: 'Aksesuarlar' });
    expect(upd.body.data.name).toBe('Aksesuarlar');
    const del = await request(a).delete(`/api/v1/admin/categories/${create.body.data.id}`).set(auth(ad.accessToken));
    expect(del.status).toBe(204);

    const cats = await request(a).get('/api/v1/admin/categories').set(auth(ad.accessToken));
    const withProducts = cats.body.data.find((c: { productCount: number }) => c.productCount > 0);
    const blocked = await request(a).delete(`/api/v1/admin/categories/${withProducts.id}`).set(auth(ad.accessToken));
    expect(blocked.status).toBe(409);
  });

  it('müşteri listesi ve dashboard verisi', async () => {
    const a = await getApp();
    const ad = await login(ADMIN.email, ADMIN.password);
    const customers = await request(a).get('/api/v1/admin/customers?q=musteri').set(auth(ad.accessToken));
    expect(customers.status).toBe(200);
    expect(customers.body.data.some((c: { email: string }) => c.email === CUSTOMER.email)).toBe(true);
    expect(JSON.stringify(customers.body)).not.toContain('passwordHash');
    const dash = await request(a).get('/api/v1/admin/dashboard').set(auth(ad.accessToken));
    expect(dash.body.data.totals.products).toBeGreaterThan(0);
    expect(Array.isArray(dash.body.data.lowStock)).toBe(true);
  });

  it('görsel yükleme: yalnızca izinli tipler', async () => {
    const a = await getApp();
    const ad = await login(ADMIN.email, ADMIN.password);
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const ok = await request(a).post('/api/v1/admin/uploads').set(auth(ad.accessToken)).attach('file', png, { filename: 'test.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.url).toMatch(/^\/uploads\//);
    const bad = await request(a).post('/api/v1/admin/uploads').set(auth(ad.accessToken)).attach('file', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(bad.status).toBe(400);
  });
});
