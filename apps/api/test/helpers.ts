import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { db, initDatabase } from '../src/shared/db';

let app: Express | null = null;

export async function getApp(): Promise<Express> {
  if (!app) {
    await initDatabase();
    app = createApp();
  }
  return app;
}

export async function resetDb() {
  await initDatabase();
  await db().reset();
}

export const ADMIN = { email: 'admin@example.com', password: 'Admin12345' };
export const CUSTOMER = { email: 'musteri@example.com', password: 'Musteri12345' };

export async function login(email: string, password: string) {
  const a = await getApp();
  const res = await request(a).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`Giriş başarısız: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = res.headers['set-cookie'] as unknown as string[] | undefined;
  return { accessToken: res.body.data.accessToken as string, cookies: cookie ?? [], user: res.body.data.user };
}

export async function registerUser(overrides: Partial<Record<string, unknown>> = {}) {
  const a = await getApp();
  const email = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const body = {
    firstName: 'Test',
    lastName: 'Kullanıcı',
    email,
    password: 'Sifre12345',
    acceptTerms: true,
    ...overrides,
  };
  const res = await request(a).post('/api/v1/auth/register').send(body);
  return { res, email, password: body.password as string };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function firstProductWithStock() {
  const a = await getApp();
  const res = await request(a).get('/api/v1/products?inStock=true&pageSize=1');
  const item = res.body.data[0];
  const detail = await request(a).get(`/api/v1/products/${item.id}`);
  const product = detail.body.data;
  const variant = product.variants.find((v: { stockQuantity: number; isActive: boolean }) => v.isActive && v.stockQuantity > 0);
  return { product, variant };
}
