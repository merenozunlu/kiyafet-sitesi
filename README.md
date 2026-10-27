# Atölye — Giyim E-Ticaret

Minimalist, premium giyim mağazası. Müşteri vitrini + yönetici paneli.

Varsayılan çalışma biçimi **veritabanı gerektirmez**: API bellek içi (seed’li) veri kullanır. PostgreSQL ve iyzico Aşama 9’da isteğe bağlıdır.

## Yığın

| Katman | Teknoloji |
| --- | --- |
| Vitrin | React 18, TypeScript, Vite, Tailwind, TanStack Query, Zustand, React Hook Form |
| API | Node, Express, TypeScript, Zod, JWT (access + HttpOnly refresh) |
| Paylaşılan | `@shop/shared` — DTO, Zod şemaları, para biçimi, durum makinesi |
| Veri | Memory store (varsayılan) veya Prisma + PostgreSQL |
| Ödeme | `PaymentProvider` arayüzü → mock (varsayılan) veya iyzico sandbox |

Monorepo: `apps/web`, `apps/api`, `packages/shared`.

## Hızlı başlangıç (DB yok)

```bash
cp .env.example .env
npm install
npm run dev
```

- Mağaza: http://localhost:5173
- API: http://localhost:4000/api/v1/health

### Demo hesaplar

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Yönetici | `admin@example.com` | `Admin12345` |
| Müşteri | `musteri@example.com` | `Musteri12345` |

Yönetici paneli: http://localhost:5173/admin/giris

### Demo kartlar (mock ödeme)

Bu bir **demo ödeme sağlayıcısıdır**; gerçek kart işlemi yapılmaz.

| Kart | Sonuç |
| --- | --- |
| `4111 1111 1111 1111` | Başarılı |
| `4000 0000 0000 0002` | Reddedildi (yetersiz bakiye) |
| `4000 0000 0000 0069` | Süresi dolmuş |

Kart numarası, CVC ve tam PAN hiçbir yerde saklanmaz ve loglanmaz. Yanıtta yalnızca `cardLast4` döner.

## Komutlar

```bash
npm run dev              # API + vitrin
npm run typecheck
npm run lint
npm run test             # Vitest (API Supertest + web RTL)
npm run test:e2e         # Playwright (önce dev sunucularını ayağa kaldırır)
```

## Mimari notları

- Tüm tutarlar **kuruş** cinsinden tam sayıdır (`priceCents`). Gösterim `Intl.NumberFormat('tr-TR')`.
- Sepet toplamları, kargo eşiği (1.500 ₺ üzeri ücretsiz) ve stok **sunucuda** hesaplanır.
- Misafir sepeti tarayıcıda yalnızca `{ variantId, quantity }` tutar; fiyat/stok `/cart/validate` ile doğrulanır. Girişte `/cart/merge` aynı varyantı toplar, stokla sınırlar.
- Sipariş oluşturma `Idempotency-Key` ister; aynı anahtar aynı siparişi döner, stok iki kez düşmez.
- Sipariş durum makinesi: `PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED` (iptal/iade dalları). Müşteri yalnızca `PENDING` / `CONFIRMED` iken iptal edebilir.
- Access JWT bellekte (Zustand); refresh token HttpOnly cookie, path `/api/v1/auth`, rotasyon + reuse detection.

## PostgreSQL (isteğe bağlı)

```bash
docker compose up -d db
# .env içinde:
#   DATA_SOURCE=prisma
#   DATABASE_URL=postgresql://shop:shop@localhost:5432/shop?schema=public
npx prisma migrate deploy    # veya ilk kez: npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Prisma şeması `prisma/schema.prisma`. Servis katmanı repository arayüzüne bağlıdır; `DATA_SOURCE` değişince iş kuralları aynı kalır.

## iyzico sandbox (isteğe bağlı)

```
PAYMENT_PROVIDER=iyzico
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

Anahtarlar yalnızca backend ortam değişkenlerinde tutulur. Mock’u gerçek ödeme diye sunmayın.

## Güvenlik ve KVKK

- Şifreler bcrypt ile saklanır (düz metin yok).
- Yönetici rolü kayıt formundan seçilemez; ilk admin seed ile oluşur.
- `.env` Git’e eklenmez.
- Hata yanıtlarında stack trace ve şifre/hash/kart verisi yoktur. Logger bu alanları redakte eder.
- LocalStorage’da sipariş tutulmaz; sipariş kaynağı yalnızca API’dir.
- KVKK: uygulama kişisel veriyi sipariş ve hesap işlemleri için işler. Bu depo bir **uyumluluk belgesi değildir**; aydınlatma metni ve resmi süreçler yayın öncesi hukuk danışmanlığı ile tamamlanmalıdır.

## Test kartı / ödeme uyarısı

Mock ve iyzico sandbox **gerçek tahsilat değildir**. Üretimde `PAYMENT_PROVIDER=iyzico`, canlı anahtarlar ve 3D Secure akışı ayrıca doğrulanmalıdır.

## Proje yapısı

```
apps/web          Vitrin + /admin
apps/api          Express API
packages/shared   Ortak şema ve DTO
prisma/           PostgreSQL sözleşmesi ve seed
docs/             Sistem tasarımı, API spec, plan
e2e/              Playwright senaryoları
```
