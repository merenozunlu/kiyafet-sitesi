# Geliştirme Planı

Her aşamanın sonunda `npm run lint`, `npm run typecheck` ve ilgili testler çalıştırılır; kabul kriterleri sağlanmadan sonraki aşamaya geçilmez.

## Aşama 1 — Analiz ve sistem tasarımı

Çıktılar: `docs/SYSTEM_DESIGN.md`, `docs/API_SPEC.md`, `docs/DEVELOPMENT_PLAN.md`.

Kabul: Veri modeli, API sözleşmesi, auth stratejisi, sepet/sipariş kuralları, güvenlik önlemleri ve aşamalar yazılı.

## Aşama 2 — Proje altyapısı

- npm workspaces monorepo (`apps/web`, `apps/api`, `packages/shared`).
- `apps/api`: Express, env doğrulama, pino logger, helmet/cors/cookie-parser, merkezi hata işleyici, `requestId`, `/health`.
- Repository arayüzleri + `MemoryStore` + seed (6 kategori, 24+ ürün, görsel ve varyantlar, admin ve demo müşteri).
- `apps/web`: Vite + React + TS + Tailwind, router iskeleti, `api-client.ts`, QueryClient provider.
- `packages/shared`: temel Zod şemaları ve tipler.
- `prisma/schema.prisma` (sözleşme), `.env.example`, `.gitignore`, kök `README.md`.

Kabul: `npm run dev` ile iki uygulama ayakta; `GET /api/v1/health` ve `GET /api/v1/products` gerçek seed verisi döner; web ana sayfa API'den ürün listesini çeker.

## Aşama 3 — UI temel sistemi

- `styles/tokens.css` (verilen palet), Tailwind tema eşlemesi, Inter fontu.
- `components/ui`: Button, Input, PasswordInput, Checkbox, RadioGroup, Select, Textarea, Modal, Drawer, Badge, Toast, Skeleton, Spinner, EmptyState, ErrorState, ConfirmDialog, Pagination, Breadcrumb, Price, QuantitySelector.
- Header (duyuru şeridi, logo, nav, arama, hesap/favori/sepet ikonları, mobil menü), Footer, `StorefrontLayout`, `AdminLayout`.

Kabul: Component'ler loading/disabled/error/focus durumlarını destekler; typecheck ve birkaç RTL testi geçer.

## Aşama 4 — Ürün kataloğu

- Ana sayfa bölümleri (hero, yeni sezon, kategoriler, çok satanlar, indirimler, koleksiyon, güven, bülten).
- `/urunler` ve `/kategori/:slug`: sunucu tarafı filtre/sıralama/sayfalama, URL query senkronu, facet'ler.
- Canlı arama (debounce 300 ms, önizleme, Enter ile `/arama`).
- Ürün detay: galeri + lightbox (ok tuşları, Escape, arka plan tıklama), zorunlu beden, stok dışı beden devre dışı, benzer ürünler.
- Favoriler (misafir: localStorage, kullanıcı: API).

Kabul: Filtreler yenilemede korunur; beden seçmeden sepete ekleme engellenir; görseller fallback'li.

## Aşama 5 — Kimlik doğrulama ve hesap

- Backend: register/login/refresh/logout/me/forgot/reset, bcrypt, JWT, refresh rotation, rate limit, `requireAuth`, `requireRole`.
- Frontend: formlar (RHF+Zod), `authStore`, api-client refresh kuyruğu, `RequireAuth`/`RequireAdmin` guard'ları, profil, adres CRUD, varsayılan adres.
- Supertest: auth senaryoları (başarılı/başarısız kayıt-giriş, tekrar e-posta, zayıf şifre, süresi dolmuş token, yetkisiz admin, başkasının kaynağı).

Kabul: Tüm auth testleri geçer; sayfa yenilemede oturum refresh ile korunur.

## Aşama 6 — Sepet

- Backend: cart modülü (get/add/patch/delete/clear/validate/merge), stok ve fiyat doğrulaması, uyarılar, kargo kuralı.
- Frontend: `useCart()` (misafir + kullanıcı), sepet drawer'ı ve `/sepet` sayfası, adet değiştirme, silme, özet, empty state, giriş sonrası merge.

Kabul: Sepet testleri (birleştirme, stok sınırı, negatif adet reddi) geçer.

## Aşama 7 — Checkout ve siparişler

- `PaymentProvider` arayüzü + `MockPaymentProvider`, webhook idempotency.
- Sipariş servisi: idempotency key, transaction, stok düşme/iade, durum makinesi, sipariş numarası.
- Frontend: çok adımlı checkout (sepet → teslimat → özet → ödeme → sonuç), adres seçimi, 3 ödeme yöntemi, havale talimatı, siparişlerim ve detay, iptal.

Kabul: Eşzamanlı sipariş testi stoğu negatife düşürmez; başarısız kart ödemesinde stok iade edilir; aynı idempotency key ikinci sipariş oluşturmaz.

## Aşama 8 — Yönetici paneli

- Backend admin modülü: dashboard aggregate, ürün/varyant/görsel CRUD (soft delete), upload adaptörü, kategori CRUD, sipariş listesi/detay/durum ve ödeme durumu güncelleme, müşteri listesi, audit log.
- Frontend `/admin`: giriş, dashboard, ürün listesi/form (varyant tablosu), kategoriler, siparişler/detay/durum güncelleme modalı, müşteriler.

Kabul: Müşteri rolü admin endpoint'lerinden 403 alır; durum geçiş kuralları uygulanır; müşteri yeni durumu görür.

## Aşama 9 — Veritabanı ve ödeme sağlayıcısı

- `docker-compose.yml` (PostgreSQL), Prisma migration + seed, `PrismaRepositories`, `DATA_SOURCE=prisma`.
- Aynı Supertest paketi Prisma ile de çalıştırılır.
- `IyzicoPaymentProvider` (sandbox) + callback/webhook doğrulama; `PAYMENT_PROVIDER=mock|iyzico`.

Kabul: Her iki veri kaynağında API testleri geçer; iyzico sandbox ödeme akışı dokümante edilir.

## Aşama 10 — Test ve son düzenlemeler

- Vitest/RTL (component ve hook testleri), Supertest eksikleri, Playwright 5 senaryo.
- Responsive kontrol, erişilebilirlik (label, focus, klavye), güvenlik gözden geçirme, performans (code splitting, görsel lazy loading).
- README: kurulum, komutlar, env, demo hesaplar, bilinen eksikler.

## Çalıştırma Komutları (hedef)

```bash
npm install
cp .env.example .env
npm run dev            # web (5173) + api (4000)
npm run lint
npm run typecheck
npm run test           # vitest (web + api)
npm run test:e2e       # playwright
```
