import { z } from 'zod';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  SIZES,
} from './constants';

// ---------- Yardımcılar ----------

export const emailSchema = z
  .string({ required_error: 'E-posta zorunludur' })
  .trim()
  .min(1, 'E-posta zorunludur')
  .email('Geçerli bir e-posta adresi girin')
  .max(120, 'E-posta çok uzun')
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string({ required_error: 'Şifre zorunludur' })
  .min(8, 'Şifre en az 8 karakter olmalıdır')
  .max(72, 'Şifre en fazla 72 karakter olabilir')
  .regex(/[A-Za-z]/, 'Şifre en az bir harf içermelidir')
  .regex(/\d/, 'Şifre en az bir rakam içermelidir');

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/, 'Geçerli bir cep telefonu numarası girin')
  .transform((v) => v.replace(/\s/g, ''));

export const nameSchema = (label: string) =>
  z
    .string({ required_error: `${label} zorunludur` })
    .trim()
    .min(2, `${label} en az 2 karakter olmalıdır`)
    .max(60, `${label} en fazla 60 karakter olabilir`);

const idSchema = z.string().trim().min(1, 'Geçersiz kimlik');

const booleanQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

const csvList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) =>
    (Array.isArray(v) ? v : v.split(','))
      .map((s) => s.trim())
      .filter(Boolean),
  );

// ---------- Auth ----------

export const registerSchema = z
  .object({
    firstName: nameSchema('Ad'),
    lastName: nameSchema('Soyad'),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
    password: passwordSchema,
    passwordConfirm: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Kullanım koşullarını kabul etmelisiniz' }),
    }),
  })
  .refine((d) => d.passwordConfirm === undefined || d.passwordConfirm === d.password, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Şifre zorunludur'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Geçersiz bağlantı'),
    password: passwordSchema,
    passwordConfirm: z.string().optional(),
  })
  .refine((d) => d.passwordConfirm === undefined || d.passwordConfirm === d.password, {
    path: ['passwordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  firstName: nameSchema('Ad').optional(),
  lastName: nameSchema('Soyad').optional(),
  phone: phoneSchema.nullable().optional().or(z.literal('').transform(() => null)),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre zorunludur'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string().optional(),
  })
  .refine((d) => d.newPasswordConfirm === undefined || d.newPasswordConfirm === d.newPassword, {
    path: ['newPasswordConfirm'],
    message: 'Şifreler eşleşmiyor',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---------- Adres ----------

export const addressInputSchema = z.object({
  title: z.string().trim().min(2, 'Adres başlığı en az 2 karakter olmalıdır').max(40),
  firstName: nameSchema('Ad'),
  lastName: nameSchema('Soyad'),
  phone: phoneSchema,
  city: z.string().trim().min(2, 'İl zorunludur').max(40),
  district: z.string().trim().min(2, 'İlçe zorunludur').max(40),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Posta kodu 5 haneli olmalıdır')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  line: z.string().trim().min(10, 'Açık adres en az 10 karakter olmalıdır').max(300),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressInputSchema>;
export const addressUpdateSchema = addressInputSchema.partial();

// ---------- Ürün sorguları ----------

export const productListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  ids: csvList.optional(),
  category: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  size: csvList.optional(),
  color: csvList.optional(),
  inStock: booleanQuery.optional(),
  onSale: booleanQuery.optional(),
  isNew: booleanQuery.optional(),
  isFeatured: booleanQuery.optional(),
  sort: z.enum(PRODUCT_SORTS).default('recommended'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'En az 2 karakter girin').max(60),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

// ---------- Sepet ----------

export const cartLineSchema = z.object({
  variantId: idSchema,
  quantity: z.coerce.number().int('Adet tam sayı olmalıdır').min(1, 'Adet en az 1 olmalıdır').max(20, 'Tek seferde en fazla 20 adet'),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const cartLinesSchema = z.object({
  items: z.array(cartLineSchema).max(50),
});

export const cartQuantitySchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Adet en az 1 olmalıdır').max(20),
});

// ---------- Sipariş / Ödeme ----------

export const cardInputSchema = z.object({
  holderName: z.string().trim().min(3, 'Kart üzerindeki isim zorunludur').max(60),
  number: z
    .string()
    .transform((v) => v.replace(/\s|-/g, ''))
    .pipe(z.string().regex(/^\d{13,19}$/, 'Kart numarası 13-19 haneli olmalıdır')),
  expMonth: z.coerce.number().int().min(1, 'Geçersiz ay').max(12, 'Geçersiz ay'),
  expYear: z.coerce.number().int().min(2024, 'Kartın süresi dolmuş').max(2045, 'Geçersiz yıl'),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC 3 veya 4 haneli olmalıdır'),
});
export type CardInput = z.infer<typeof cardInputSchema>;

export const shippingAddressInputSchema = z.union([
  z.object({ addressId: idSchema }),
  addressInputSchema.omit({ isDefault: true }).extend({ title: z.string().trim().max(40).optional() }),
]);

export const createOrderSchema = z
  .object({
    items: z.array(cartLineSchema).max(50).optional(),
    guestEmail: emailSchema.optional(),
    shippingAddress: shippingAddressInputSchema,
    paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Ödeme yöntemi seçin' }) }),
    card: cardInputSchema.optional(),
    note: z.string().trim().max(300).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.paymentMethod === 'CREDIT_CARD' && !d.card) {
      ctx.addIssue({ code: 'custom', path: ['card'], message: 'Kart bilgileri zorunludur' });
    }
  });
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const cancelOrderSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// ---------- Admin ----------

export const productImageInputSchema = z.object({
  id: z.string().optional(),
  imageUrl: z.string().trim().url('Geçerli bir görsel adresi girin').or(z.string().regex(/^(\/uploads\/|data:image\/)/)),
  altText: z.string().trim().max(160).nullable().optional().transform((v) => v ?? ''),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().max(40).optional(),
  size: z.enum(SIZES, { errorMap: () => ({ message: 'Beden seçin' }) }),
  color: z.string().trim().min(2, 'Renk zorunludur').max(40),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Renk kodu #RRGGBB biçiminde olmalıdır')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  stockQuantity: z.coerce.number().int('Stok tam sayı olmalıdır').min(0, 'Stok negatif olamaz'),
  priceOverrideCents: z.coerce.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(3, 'Ürün adı en az 3 karakter olmalıdır').max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
      .max(140)
      .optional()
      .or(z.literal('').transform(() => undefined)),
    description: z.string().trim().min(10, 'Açıklama en az 10 karakter olmalıdır').max(4000),
    priceCents: z.coerce.number().int('Fiyat kuruş cinsinden tam sayı olmalıdır').min(1, 'Fiyat sıfırdan büyük olmalıdır'),
    compareAtPriceCents: z.coerce.number().int().min(0).nullable().optional(),
    categoryId: idSchema,
    status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
    isFeatured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    images: z.array(productImageInputSchema).max(10).default([]),
    variants: z.array(productVariantInputSchema).min(1, 'En az bir varyant tanımlayın').max(60),
  })
  .superRefine((d, ctx) => {
    if (d.compareAtPriceCents != null && d.compareAtPriceCents <= d.priceCents) {
      ctx.addIssue({
        code: 'custom',
        path: ['compareAtPriceCents'],
        message: 'Önceki fiyat güncel fiyattan büyük olmalıdır',
      });
    }
    const seen = new Set<string>();
    d.variants.forEach((v, i) => {
      const key = `${v.size}|${v.color.toLowerCase()}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: 'custom',
          path: ['variants', i, 'size'],
          message: 'Aynı beden ve renk kombinasyonu birden fazla kez tanımlanamaz',
        });
      }
      seen.add(key);
    });
  });
export type ProductInput = z.infer<typeof productInputSchema>;
export const productUpdateSchema = productInputSchema.innerType().partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, 'Kategori adı en az 2 karakter olmalıdır').max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')
    .max(80)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  description: z.string().trim().max(300).optional().or(z.literal('').transform(() => undefined)),
  imageUrl: z.string().trim().url('Geçerli bir görsel adresi girin').optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryUpdateSchema = categoryInputSchema.partial();

export const adminProductListQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminOrderListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: 'Durum seçin' }) }),
    note: z.string().trim().max(300).optional().or(z.literal('').transform(() => undefined)),
    trackingNumber: z.string().trim().max(60).optional().or(z.literal('').transform(() => undefined)),
  })
  .superRefine((d, ctx) => {
    if (d.status === 'SHIPPED' && !d.trackingNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['trackingNumber'],
        message: 'Kargoya verildi durumu için takip numarası zorunludur',
      });
    }
  });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['PAID', 'FAILED', 'REFUNDED']),
  note: z.string().trim().max(300).optional().or(z.literal('').transform(() => undefined)),
});

export const adminCustomerListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const favoriteMergeSchema = z.object({ productIds: z.array(idSchema).max(200) });

export const newsletterSchema = z.object({ email: emailSchema });
