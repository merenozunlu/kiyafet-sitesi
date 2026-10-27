import bcrypt from 'bcryptjs';
import type { Size } from '@shop/shared';
import { SIZES } from '@shop/shared';
import { buildSku, seedCategories, seedProducts } from '../seed-data';
import { emptyStoreData, type StoreData } from './store';
import { randomUUID } from 'node:crypto';

export interface SeedOptions {
  adminEmail: string;
  adminPassword: string;
  demoCustomerEmail?: string;
  demoCustomerPassword?: string;
}

const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);

export function buildSeedData(opts: SeedOptions): StoreData {
  const data = emptyStoreData();
  const now = new Date();
  const salt = bcrypt.genSaltSync(10);

  data.users.push({
    id: randomUUID(),
    email: opts.adminEmail.toLowerCase(),
    passwordHash: bcrypt.hashSync(opts.adminPassword, salt),
    firstName: 'Mağaza',
    lastName: 'Yöneticisi',
    phone: null,
    role: 'ADMIN',
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(120),
  });

  if (opts.demoCustomerEmail && opts.demoCustomerPassword) {
    const customerId = randomUUID();
    data.users.push({
      id: customerId,
      email: opts.demoCustomerEmail.toLowerCase(),
      passwordHash: bcrypt.hashSync(opts.demoCustomerPassword, salt),
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      phone: '05321234567',
      role: 'CUSTOMER',
      isActive: true,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    });
    data.addresses.push({
      id: randomUUID(),
      userId: customerId,
      title: 'Ev',
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      phone: '05321234567',
      city: 'İstanbul',
      district: 'Kadıköy',
      postalCode: '34710',
      line: 'Caferağa Mah. Moda Cad. No:12 D:4',
      isDefault: true,
      createdAt: daysAgo(29),
      updatedAt: daysAgo(29),
    });
  }

  const categoryIds = new Map<string, string>();
  for (const c of seedCategories) {
    const id = randomUUID();
    categoryIds.set(c.slug, id);
    data.categories.push({
      id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      isActive: true,
      sortOrder: c.sortOrder,
      createdAt: daysAgo(100),
      updatedAt: daysAgo(100),
    });
  }

  for (const p of seedProducts) {
    const productId = randomUUID();
    const createdAt = daysAgo(p.ageDays);
    data.products.push({
      id: productId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceCents: p.priceCents,
      compareAtPriceCents: p.compareAtPriceCents ?? null,
      categoryId: categoryIds.get(p.category)!,
      status: 'ACTIVE',
      isFeatured: p.isFeatured ?? false,
      isNew: p.isNew ?? false,
      salesCount: p.salesCount,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    p.images.forEach((img, i) =>
      data.productImages.push({ id: randomUUID(), productId, imageUrl: img.url, altText: img.alt, sortOrder: i }),
    );
    for (const color of p.colors) {
      for (const size of SIZES) {
        const stock = color.stock[size as Size];
        if (stock === undefined) continue;
        data.productVariants.push({
          id: randomUUID(),
          productId,
          sku: buildSku(p.slug, color.name, size),
          size,
          color: color.name,
          colorHex: color.hex,
          stockQuantity: stock,
          priceOverrideCents: null,
          isActive: true,
          createdAt,
          updatedAt: now,
        });
      }
    }
  }

  return data;
}
