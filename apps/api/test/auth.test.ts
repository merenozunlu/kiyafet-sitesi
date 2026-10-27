import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ADMIN, CUSTOMER, auth, getApp, login, registerUser, resetDb } from './helpers';

describe('Auth', () => {
  beforeEach(resetDb);

  it('kayıt olur, access token döner ve refresh cookie HttpOnly olur', async () => {
    const { res } = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('refresh_token=') && /HttpOnly/i.test(c))).toBe(true);
  });

  it('kayıt gövdesinde role=ADMIN gönderilse bile müşteri olarak kaydeder', async () => {
    const { res } = await registerUser({ role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CUSTOMER');
  });

  it('aynı e-posta ile ikinci kayıt CONFLICT döner', async () => {
    const { res } = await registerUser({ email: CUSTOMER.email });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('zayıf şifre VALIDATION_ERROR döner', async () => {
    const { res } = await registerUser({ password: 'kisa' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('yanlış şifre ile giriş 401 döner ve kullanıcı var/yok sızdırmaz', async () => {
    const a = await getApp();
    const wrong = await request(a).post('/api/v1/auth/login').send({ email: CUSTOMER.email, password: 'Yanlis12345' });
    const missing = await request(a).post('/api/v1/auth/login').send({ email: 'yok@example.com', password: 'Yanlis12345' });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });

  it('/me access token ile kullanıcıyı döner, tokensiz 401', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const ok = await request(a).get('/api/v1/auth/me').set(auth(accessToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.email).toBe(CUSTOMER.email);
    const no = await request(a).get('/api/v1/auth/me');
    expect(no.status).toBe(401);
  });

  it('refresh token rotasyonu: eski token tekrar kullanılınca tüm oturumlar iptal edilir', async () => {
    const a = await getApp();
    const { cookies } = await login(CUSTOMER.email, CUSTOMER.password);
    const first = await request(a).post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(first.status).toBe(200);
    const newCookies = first.headers['set-cookie'] as unknown as string[];
    // Eski cookie tekrar kullanılıyor -> reuse detection
    const reuse = await request(a).post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(reuse.status).toBe(401);
    // Yeni cookie de artık geçersiz olmalı
    const after = await request(a).post('/api/v1/auth/refresh').set('Cookie', newCookies);
    expect(after.status).toBe(401);
  });

  it('logout sonrası refresh başarısız olur', async () => {
    const a = await getApp();
    const { cookies } = await login(CUSTOMER.email, CUSTOMER.password);
    const out = await request(a).post('/api/v1/auth/logout').set('Cookie', cookies);
    expect(out.status).toBe(204);
    const r = await request(a).post('/api/v1/auth/refresh').set('Cookie', cookies);
    expect(r.status).toBe(401);
  });

  it('şifre sıfırlama akışı çalışır', async () => {
    const a = await getApp();
    const forgot = await request(a).post('/api/v1/auth/forgot-password').send({ email: CUSTOMER.email });
    expect(forgot.status).toBe(200);
    const url: string = forgot.body.data.debugResetUrl;
    expect(url).toContain('token=');
    const token = new URL(url).searchParams.get('token')!;
    const reset = await request(a).post('/api/v1/auth/reset-password').send({ token, password: 'YeniSifre123', passwordConfirm: 'YeniSifre123' });
    expect(reset.status).toBe(200);
    const old = await request(a).post('/api/v1/auth/login').send({ email: CUSTOMER.email, password: CUSTOMER.password });
    expect(old.status).toBe(401);
    const fresh = await request(a).post('/api/v1/auth/login').send({ email: CUSTOMER.email, password: 'YeniSifre123' });
    expect(fresh.status).toBe(200);
    // Token tek kullanımlık
    const again = await request(a).post('/api/v1/auth/reset-password').send({ token, password: 'Baska12345', passwordConfirm: 'Baska12345' });
    expect(again.status).toBe(400);
  });

  it('bilinmeyen e-posta için forgot-password aynı yanıtı döner', async () => {
    const a = await getApp();
    const res = await request(a).post('/api/v1/auth/forgot-password').send({ email: 'yok@example.com' });
    expect(res.status).toBe(200);
  });

  it('müşteri admin uç noktasına erişemez (403), admin erişir', async () => {
    const a = await getApp();
    const c = await login(CUSTOMER.email, CUSTOMER.password);
    const forbidden = await request(a).get('/api/v1/admin/dashboard').set(auth(c.accessToken));
    expect(forbidden.status).toBe(403);
    const ad = await login(ADMIN.email, ADMIN.password);
    const ok = await request(a).get('/api/v1/admin/dashboard').set(auth(ad.accessToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.totals).toBeDefined();
  });
});

describe('Profil ve adresler', () => {
  beforeEach(resetDb);

  it('profil günceller ve şifre değiştirir', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const upd = await request(a).patch('/api/v1/users/me').set(auth(accessToken)).send({ firstName: 'Ayşe', lastName: 'Yılmaz', phone: '05551234567' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.firstName).toBe('Ayşe');
    const ch = await request(a)
      .post('/api/v1/users/me/change-password')
      .set(auth(accessToken))
      .send({ currentPassword: CUSTOMER.password, newPassword: 'Yeni12345x', newPasswordConfirm: 'Yeni12345x' });
    expect([200, 204]).toContain(ch.status);
    const relog = await request(a).post('/api/v1/auth/login').send({ email: CUSTOMER.email, password: 'Yeni12345x' });
    expect(relog.status).toBe(200);
  });

  it('adres CRUD ve varsayılan adres', async () => {
    const a = await getApp();
    const { accessToken } = await login(CUSTOMER.email, CUSTOMER.password);
    const body = { title: 'İş', firstName: 'Ayşe', lastName: 'Yılmaz', phone: '05551234567', city: 'İstanbul', district: 'Kadıköy', postalCode: '34710', line: 'Moda Cad. No:1 D:2', isDefault: false };
    const created = await request(a).post('/api/v1/addresses').set(auth(accessToken)).send(body);
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const def = await request(a).post(`/api/v1/addresses/${id}/default`).set(auth(accessToken));
    expect(def.status).toBe(200);
    const list = await request(a).get('/api/v1/addresses').set(auth(accessToken));
    expect(list.body.data.find((x: { id: string }) => x.id === id).isDefault).toBe(true);
    expect(list.body.data.filter((x: { isDefault: boolean }) => x.isDefault)).toHaveLength(1);

    // Başka kullanıcı erişemez
    const other = await registerUser();
    const otherToken = other.res.body.data.accessToken;
    const forbidden = await request(a).delete(`/api/v1/addresses/${id}`).set(auth(otherToken));
    expect(forbidden.status).toBe(404);

    const del = await request(a).delete(`/api/v1/addresses/${id}`).set(auth(accessToken));
    expect(del.status).toBe(204);
  });
});
