# API Sözleşmesi — `/api/v1`

## Genel Kurallar

- Tüm yanıtlar JSON. Başarılı yanıt: `{ "data": ... , "meta"?: ... }`. Hata yanıtı:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Geçersiz istek", "details": [{ "path": "email", "message": "Geçerli bir e-posta girin" }] } }
```

- Hata kodları: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `OUT_OF_STOCK` (409), `INVALID_STATE_TRANSITION` (409), `RATE_LIMITED` (429), `PAYMENT_FAILED` (402), `INTERNAL_ERROR` (500).
- Kimlik: `Authorization: Bearer <accessToken>`. Refresh token yalnızca `HttpOnly` cookie (`refresh_token`).
- Yetki sütunu: `Herkes`, `Kullanıcı` (CUSTOMER veya ADMIN), `Admin`.
- Tutarlar kuruş cinsinden tam sayıdır (`...Cents`).
- Sayfalı listeler: `meta: { page, pageSize, total, totalPages }`.

## Ortak DTO'lar

```ts
UserDto { id, email, firstName, lastName, phone: string|null, role: 'CUSTOMER'|'ADMIN', createdAt }
CategoryDto { id, name, slug, description, imageUrl, isActive, productCount? }
ProductImageDto { id, imageUrl, altText, sortOrder }
ProductVariantDto { id, sku, size, color, colorHex, stockQuantity, priceCents, isActive }
ProductListItemDto { id, name, slug, priceCents, compareAtPriceCents, discountPercent, category: {id,name,slug}, image: ProductImageDto|null, isNew, isFeatured, inStock, availableSizes: string[], colors: {name,hex}[] }
ProductDetailDto extends ProductListItemDto { description, images: ProductImageDto[], variants: ProductVariantDto[], status }
AddressDto { id, title, firstName, lastName, phone, city, district, postalCode, line, isDefault }
CartItemDto { id, productId, variantId, name, slug, imageUrl, size, color, unitPriceCents, quantity, lineTotalCents, stockQuantity, warning?: 'OUT_OF_STOCK'|'QUANTITY_REDUCED'|'PRICE_CHANGED' }
CartSummaryDto { subtotalCents, discountCents, shippingCents, totalCents, freeShippingThresholdCents }
CartDto { items: CartItemDto[], summary: CartSummaryDto, warnings: string[] }
OrderItemDto { id, productId, variantId, productName, size, color, imageUrl, unitPriceCents, quantity, lineTotalCents }
OrderDto { id, orderNumber, status, paymentStatus, paymentMethod, subtotalCents, discountCents, shippingCents, totalCents, shippingAddress: AddressSnapshot, items: OrderItemDto[], statusHistory: {fromStatus,toStatus,note,trackingNumber,createdAt}[], payment: { provider, reference, status, cardLast4? , bankTransferInstructions? }, createdAt }
```

## Health

| Metot | Yol | Yetki | Açıklama |
| --- | --- | --- | --- |
| GET | `/health` | Herkes | `{ data: { status: 'ok', dataSource: 'memory'|'prisma' } }` |

## Auth

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Herkes | `{ firstName, lastName, email, phone?, password, acceptTerms: true }` | 201 `{ data: { user: UserDto, accessToken } }` + refresh cookie. 409 `CONFLICT` e-posta kayıtlı |
| POST | `/auth/login` | Herkes | `{ email, password }` | 200 `{ data: { user, accessToken } }` + cookie. 401 genel mesaj |
| POST | `/auth/refresh` | Cookie | — | 200 `{ data: { user, accessToken } }` + yeni cookie (rotation). 401 → cookie silinir |
| POST | `/auth/logout` | Cookie | — | 204; refresh token iptal, cookie silinir |
| GET | `/auth/me` | Kullanıcı | — | `{ data: UserDto }` |
| POST | `/auth/forgot-password` | Herkes | `{ email }` | 200 her zaman `{ data: { message } }`; dev'de `data.debugResetUrl` döner (`NODE_ENV!=='production'`) |
| POST | `/auth/reset-password` | Herkes | `{ token, password }` | 200; 400 geçersiz/süresi dolmuş token; tüm refresh tokenlar iptal |

Rate limit: register/login/forgot-password 10/15dk/IP.

## Users (profil)

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| GET | `/users/me` | Kullanıcı | — | `UserDto` |
| PATCH | `/users/me` | Kullanıcı | `{ firstName?, lastName?, phone? }` | `UserDto` |
| POST | `/users/me/change-password` | Kullanıcı | `{ currentPassword, newPassword }` | 204 |

## Categories

| Metot | Yol | Yetki | Yanıt |
| --- | --- | --- | --- |
| GET | `/categories` | Herkes | `{ data: CategoryDto[] }` (yalnızca aktif) |
| GET | `/categories/:slug` | Herkes | `{ data: CategoryDto }` |
| GET | `/categories/:slug/products` | Herkes | `/products` ile aynı query, kategori sabit |

## Products

| Metot | Yol | Yetki | Açıklama |
| --- | --- | --- | --- |
| GET | `/products` | Herkes | Liste. Query: `q, category (slug), minPrice, maxPrice (TL), size (çoklu, virgül), color (çoklu), inStock=true, onSale=true, isNew=true, isFeatured=true, sort=recommended|newest|price_asc|price_desc|discount, page=1, pageSize=12 (max 48)`. Yanıt `{ data: ProductListItemDto[], meta, facets: { sizes, colors, priceRange } }` |
| GET | `/products/search?q=&limit=6` | Herkes | Canlı arama; `{ data: { products: ProductListItemDto[], categories: CategoryDto[] } }`. `q` 2–60 karakter |
| GET | `/products/:id` | Herkes | `ProductDetailDto` |
| GET | `/products/slug/:slug` | Herkes | `ProductDetailDto` |
| GET | `/products/:id/related?limit=4` | Herkes | Aynı kategoriden `ProductListItemDto[]` |

Yalnızca `status=ACTIVE` ve `deletedAt=null` ürünler döner.

## Favorites

| Metot | Yol | Yetki | Yanıt |
| --- | --- | --- | --- |
| GET | `/favorites` | Kullanıcı | `{ data: ProductListItemDto[] }` |
| POST | `/favorites/:productId` | Kullanıcı | 201 `{ data: { productId } }` (idempotent) |
| DELETE | `/favorites/:productId` | Kullanıcı | 204 |

Misafir favorileri istemci tarafında `localStorage` ile tutulur ve girişte `POST /favorites/merge { productIds }` ile birleştirilir.

## Addresses

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| GET | `/addresses` | Kullanıcı | — | `AddressDto[]` |
| POST | `/addresses` | Kullanıcı | `{ title, firstName, lastName, phone, city, district, postalCode?, line, isDefault? }` | 201 `AddressDto` |
| PATCH | `/addresses/:id` | Kullanıcı | kısmi | `AddressDto` |
| DELETE | `/addresses/:id` | Kullanıcı | — | 204 |
| POST | `/addresses/:id/default` | Kullanıcı | — | `AddressDto` |

Başka kullanıcının adresi → 404.

## Cart

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| GET | `/cart` | Kullanıcı | — | `CartDto` (stok/fiyat yeniden doğrulanır) |
| POST | `/cart/items` | Kullanıcı | `{ variantId, quantity }` | 200 `CartDto`. Aynı varyant → adet birleştirilir, stokla sınırlanır. 409 `OUT_OF_STOCK` |
| PATCH | `/cart/items/:itemId` | Kullanıcı | `{ quantity }` (>=1) | `CartDto` |
| DELETE | `/cart/items/:itemId` | Kullanıcı | — | `CartDto` |
| DELETE | `/cart` | Kullanıcı | — | `CartDto` (boş) |
| POST | `/cart/validate` | Herkes | `{ items: [{ variantId, quantity }] }` | `CartDto` — misafir sepeti için sunucu hesaplaması |
| POST | `/cart/merge` | Kullanıcı | `{ items: [{ variantId, quantity }] }` | `CartDto` — misafir sepetini birleştirir |

## Orders

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| POST | `/orders` | Herkes (misafir veya kullanıcı) | Header `Idempotency-Key` (uuid). Body: `{ items?: [{variantId, quantity}] (misafir zorunlu), guestEmail? (misafir zorunlu), shippingAddress: AddressInput | { addressId }, paymentMethod: 'CREDIT_CARD'|'COD'|'BANK_TRANSFER', card?: { holderName, number, expMonth, expYear, cvc } (CREDIT_CARD zorunlu), note? }` | 201 `{ data: OrderDto }`. 409 `OUT_OF_STOCK` (details ile hangi satır), 402 `PAYMENT_FAILED` |
| GET | `/orders` | Kullanıcı | `page, pageSize` | `OrderDto[]` (özet) |
| GET | `/orders/:id` | Kullanıcı | — | `OrderDto`; başkasının siparişi → 404 |
| GET | `/orders/track/:orderNumber?email=` | Herkes | — | Misafir sipariş takibi (`orderNumber + email` eşleşmeli) |
| POST | `/orders/:id/cancel` | Kullanıcı | `{ reason? }` | `OrderDto`; yalnızca PENDING/CONFIRMED |

Aynı `Idempotency-Key` + aynı kullanıcı/misafir e-postası ile tekrar istek → ilk oluşturulan sipariş 200 ile döner.

## Payments

| Metot | Yol | Yetki | İstek | Yanıt |
| --- | --- | --- | --- | --- |
| POST | `/payments/initialize` | Kullanıcı/Misafir | `{ orderId, card? }` | Mevcut `PENDING` kart siparişi için ödemeyi yeniden başlatır |
| GET | `/payments/:id/status` | Kullanıcı | — | `{ data: { status, reference } }` |
| POST | `/payments/webhook` | Sağlayıcı | ham gövde + imza başlığı (`X-Mock-Signature` / iyzico eşdeğeri) | 200 `{ received: true }`; imza geçersiz → 401; aynı `eventId` tekrar → 200, değişiklik yok |

## Admin (`requireAuth + requireRole('ADMIN')`)

| Metot | Yol | İstek | Yanıt |
| --- | --- | --- | --- |
| GET | `/admin/dashboard` | — | `{ totals: { orders, pendingOrders, completedOrders, revenueCents, products, lowStockVariants, customers }, recentOrders: OrderDto[], salesByDay: [{date, revenueCents, orders}], lowStock: [{productName, sku, size, color, stockQuantity}] }` |
| GET | `/admin/products` | `q, status, category, page, pageSize` | Tüm durumlar dahil `ProductDetailDto[]` |
| GET | `/admin/products/:id` | — | `ProductDetailDto` |
| POST | `/admin/products` | `{ name, slug?, description, priceCents, compareAtPriceCents?, categoryId, status, isFeatured, isNew, images: [{imageUrl, altText, sortOrder}], variants: [{sku?, size, color, colorHex?, stockQuantity, priceOverrideCents?, isActive}] }` | 201 `ProductDetailDto` |
| PATCH | `/admin/products/:id` | kısmi (images/variants tam liste olarak gönderilirse senkronize edilir) | `ProductDetailDto` |
| DELETE | `/admin/products/:id` | — | 204 (soft delete) |
| POST | `/admin/uploads` | `multipart/form-data` (`file`) veya `{ imageUrl }` | `{ data: { url } }` — `UploadAdapter` (local disk `/uploads`) |
| GET | `/admin/categories` | — | `CategoryDto[]` (pasifler dahil) |
| POST | `/admin/categories` | `{ name, slug?, description?, imageUrl?, isActive, sortOrder }` | 201 |
| PATCH | `/admin/categories/:id` | kısmi | `CategoryDto` |
| DELETE | `/admin/categories/:id` | — | 204; ürünü varsa 409 |
| GET | `/admin/orders` | `q (sipariş no/e-posta/ad), status, paymentStatus, page, pageSize` | `OrderDto[]` + müşteri özeti |
| GET | `/admin/orders/:id` | — | `OrderDto` + müşteri |
| PATCH | `/admin/orders/:id/status` | `{ status, note?, trackingNumber? }` | `OrderDto`; geçersiz geçiş → 409 `INVALID_STATE_TRANSITION`; `SHIPPED` için `trackingNumber` zorunlu |
| PATCH | `/admin/orders/:id/payment-status` | `{ paymentStatus: 'PAID'|'FAILED'|'REFUNDED', note? }` | Havale onayı gibi manuel işlemler |
| GET | `/admin/customers` | `q, page, pageSize` | `[{ ...UserDto, orderCount, totalSpentCents, lastOrderAt }]` |
| GET | `/admin/audit-logs` | `page` | `AuditLog[]` |

Tüm admin yazma işlemleri `AuditLog` kaydı üretir.
