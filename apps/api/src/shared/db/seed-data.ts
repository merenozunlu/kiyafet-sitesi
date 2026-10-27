import type { Size } from '@shop/shared';

/**
 * Geliştirme seed verisi. Hem memory store hem Prisma seed'i bu veriyi kullanır.
 * Görseller Unsplash'ten, her ürün için farklı fotoğraf kullanılır.
 */

const u = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export interface SeedCategory {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface SeedColor {
  name: string;
  hex: string;
  /** Beden -> stok. Belirtilmeyen bedenler varyant olarak oluşturulmaz. */
  stock: Partial<Record<Size, number>>;
}

export interface SeedProduct {
  slug: string;
  name: string;
  category: string;
  description: string;
  priceCents: number;
  compareAtPriceCents?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  salesCount: number;
  images: { url: string; alt: string }[];
  colors: SeedColor[];
  /** Gün cinsinden kaç gün önce oluşturulduğu (en yeni sıralaması için) */
  ageDays: number;
}

export const seedCategories: SeedCategory[] = [
  { slug: 'tisort', name: 'Tişört', description: 'Günlük rahatlık için temel ve baskılı tişörtler.', imageUrl: u('photo-1521572163474-6864f9cf17ab'), sortOrder: 1 },
  { slug: 'gomlek', name: 'Gömlek', description: 'Ofisten hafta sonuna uyum sağlayan gömlekler.', imageUrl: u('photo-1596755094514-f87e34085b2c'), sortOrder: 2 },
  { slug: 'elbise', name: 'Elbise', description: 'Zarif kesimler ve akışkan kumaşlar.', imageUrl: u('photo-1515372039744-b8f02a3ae446'), sortOrder: 3 },
  { slug: 'pantolon', name: 'Pantolon & Jean', description: 'Her gün giyilebilecek dayanıklı altlar.', imageUrl: u('photo-1541099649105-f69ad21f3246'), sortOrder: 4 },
  { slug: 'dis-giyim', name: 'Ceket & Mont', description: 'Mevsim geçişleri için katmanlar.', imageUrl: u('photo-1551028719-00167b16eac5'), sortOrder: 5 },
  { slug: 'triko', name: 'Triko & Kazak', description: 'Yumuşak dokulu, sıcak tutan örgüler.', imageUrl: u('photo-1576871337622-98d48d1cf531'), sortOrder: 6 },
];

const full = (s = 12): Partial<Record<Size, number>> => ({ S: s, M: s + 4, L: s + 2, XL: s, XXL: Math.max(2, s - 6) });
const limited = (): Partial<Record<Size, number>> => ({ S: 0, M: 3, L: 1, XL: 0, XXL: 2 });
const noXXL = (s = 10): Partial<Record<Size, number>> => ({ S: s, M: s + 3, L: s, XL: s - 2 });

export const seedProducts: SeedProduct[] = [
  // ---- Tişört ----
  {
    slug: 'organik-pamuk-basic-tisort-beyaz',
    name: 'Organik Pamuk Basic Tişört',
    category: 'tisort',
    description:
      '%100 organik pamuktan üretilen, bisiklet yakalı, regular kesim temel tişört. Yumuşak dokusu ve nefes alan yapısıyla her mevsim kullanıma uygundur. Yıkamada çekme yapmaz.',
    priceCents: 49_900,
    isFeatured: true,
    salesCount: 180,
    ageDays: 40,
    images: [
      { url: u('photo-1521572163474-6864f9cf17ab'), alt: 'Beyaz basic tişört ön görünüm' },
      { url: u('photo-1581655353564-df123a1eb820'), alt: 'Beyaz basic tişört detay' },
    ],
    colors: [
      { name: 'Beyaz', hex: '#F5F5F5', stock: full(14) },
      { name: 'Siyah', hex: '#111111', stock: full(10) },
      { name: 'Gri Melanj', hex: '#9CA3AF', stock: limited() },
    ],
  },
  {
    slug: 'oversize-baskili-tisort',
    name: 'Oversize Baskılı Tişört',
    category: 'tisort',
    description:
      'Düşük omuzlu oversize kalıp, ağır gramajlı pamuklu kumaş. Sırt kısmında minimal tipografik baskı. Rahat ve modern bir siluet için tasarlandı.',
    priceCents: 64_900,
    compareAtPriceCents: 79_900,
    isNew: true,
    salesCount: 95,
    ageDays: 6,
    images: [
      { url: u('photo-1583743814966-8936f5b7be1a'), alt: 'Oversize baskılı tişört' },
      { url: u('photo-1503341504253-dff4815485f1'), alt: 'Oversize tişört arka görünüm' },
    ],
    colors: [
      { name: 'Ekru', hex: '#EAE4D3', stock: full(8) },
      { name: 'Antrasit', hex: '#374151', stock: noXXL(6) },
    ],
  },
  {
    slug: 'polo-yaka-pike-tisort',
    name: 'Polo Yaka Pike Tişört',
    category: 'tisort',
    description:
      'Pike örgü pamuklu kumaş, iki düğmeli polo yaka ve ribana kol ağzı. Spor şıklığı günlük hayata taşır.',
    priceCents: 74_900,
    salesCount: 60,
    ageDays: 80,
    images: [{ url: u('photo-1562157873-818bc0726f68'), alt: 'Polo yaka pike tişört' }],
    colors: [
      { name: 'Lacivert', hex: '#1F2A44', stock: full(9) },
      { name: 'Haki', hex: '#6B7D4F', stock: full(5) },
    ],
  },
  {
    slug: 'uzun-kollu-cizgili-tisort',
    name: 'Uzun Kollu Çizgili Tişört',
    category: 'tisort',
    description:
      'Breton çizgili, uzun kollu pamuklu tişört. Hafif kumaşı ile tek başına veya ceket altına giyilebilir.',
    priceCents: 59_900,
    compareAtPriceCents: 69_900,
    salesCount: 42,
    ageDays: 25,
    images: [{ url: u('photo-1618354691373-d851c5c3a990'), alt: 'Uzun kollu çizgili tişört' }],
    colors: [{ name: 'Beyaz-Lacivert', hex: '#E5E7EB', stock: full(7) }],
  },

  // ---- Gömlek ----
  {
    slug: 'keten-karisimli-gomlek',
    name: 'Keten Karışımlı Gömlek',
    category: 'gomlek',
    description:
      'Keten-pamuk karışımı, nefes alan yazlık gömlek. Regular kesim, tek göğüs cebi, sedef düğmeler. Hafif buruşuk dokusu doğal görünüm sağlar.',
    priceCents: 89_900,
    isFeatured: true,
    salesCount: 130,
    ageDays: 30,
    images: [
      { url: u('photo-1596755094514-f87e34085b2c'), alt: 'Keten karışımlı gömlek' },
      { url: u('photo-1602810318383-e386cc2a3ccf'), alt: 'Keten gömlek detay' },
    ],
    colors: [
      { name: 'Taş', hex: '#D6CFC4', stock: full(10) },
      { name: 'Beyaz', hex: '#F5F5F5', stock: full(12) },
      { name: 'Açık Mavi', hex: '#BFD7EA', stock: limited() },
    ],
  },
  {
    slug: 'oxford-slim-fit-gomlek',
    name: 'Oxford Slim Fit Gömlek',
    category: 'gomlek',
    description:
      'Klasik oxford dokuma, düğmeli yaka, slim fit kalıp. Ofis ve özel günler için vazgeçilmez.',
    priceCents: 99_900,
    salesCount: 75,
    ageDays: 90,
    images: [{ url: u('photo-1598033129183-c4f50c736f10'), alt: 'Oxford slim fit gömlek' }],
    colors: [
      { name: 'Beyaz', hex: '#F5F5F5', stock: full(11) },
      { name: 'Açık Mavi', hex: '#BFD7EA', stock: full(9) },
    ],
  },
  {
    slug: 'flanel-ekose-gomlek',
    name: 'Flanel Ekose Gömlek',
    category: 'gomlek',
    description:
      'Fırçalanmış pamuklu flanel, yumuşak dokulu kış gömleği. Katmanlı kombinler için ideal.',
    priceCents: 94_900,
    compareAtPriceCents: 119_900,
    isNew: true,
    salesCount: 38,
    ageDays: 4,
    images: [{ url: u('photo-1566174053879-31528523f8ae'), alt: 'Flanel ekose gömlek' }],
    colors: [
      { name: 'Bordo Ekose', hex: '#7F1D1D', stock: full(6) },
      { name: 'Yeşil Ekose', hex: '#365314', stock: noXXL(5) },
    ],
  },
  {
    slug: 'saten-dokulu-kadin-gomlek',
    name: 'Saten Dokulu Kadın Gömlek',
    category: 'gomlek',
    description:
      'Akışkan saten dokulu kumaş, gizli pat, hafif bol kesim. Gün içinden akşama geçiş için.',
    priceCents: 84_900,
    salesCount: 52,
    ageDays: 18,
    images: [{ url: u('photo-1551232864-3f0890e580d9'), alt: 'Saten dokulu kadın gömlek' }],
    colors: [
      { name: 'Krem', hex: '#F3EDE0', stock: full(9) },
      { name: 'Siyah', hex: '#111111', stock: full(7) },
    ],
  },

  // ---- Elbise ----
  {
    slug: 'keten-midi-elbise',
    name: 'Keten Midi Elbise',
    category: 'elbise',
    description:
      'Askılı, bel vurgulu keten midi elbise. Arkadan fermuarlı, yan cepli. Yaz günleri için ferah ve zarif.',
    priceCents: 139_900,
    isFeatured: true,
    isNew: true,
    salesCount: 110,
    ageDays: 8,
    images: [
      { url: u('photo-1515372039744-b8f02a3ae446'), alt: 'Keten midi elbise' },
      { url: u('photo-1595777457583-95e059d581b8'), alt: 'Keten midi elbise yan görünüm' },
    ],
    colors: [
      { name: 'Kum', hex: '#D9C8A9', stock: full(8) },
      { name: 'Siyah', hex: '#111111', stock: full(6) },
    ],
  },
  {
    slug: 'cicek-desenli-sifon-elbise',
    name: 'Çiçek Desenli Şifon Elbise',
    category: 'elbise',
    description:
      'Astarlı şifon kumaş, V yaka, uzun kollu ve büzgü detaylı etek. Hafif ve hareketli bir siluet.',
    priceCents: 119_900,
    compareAtPriceCents: 159_900,
    salesCount: 67,
    ageDays: 35,
    images: [{ url: u('photo-1434389677669-e08b4cac3105'), alt: 'Çiçek desenli şifon elbise' }],
    colors: [{ name: 'Çok Renkli', hex: '#C084FC', stock: noXXL(7) }],
  },
  {
    slug: 'triko-kalem-elbise',
    name: 'Triko Kalem Elbise',
    category: 'elbise',
    description:
      'Esnek fitilli triko, balıkçı yaka, diz altı boy. Vücudu saran ancak rahat bırakan kalıp.',
    priceCents: 109_900,
    salesCount: 48,
    ageDays: 60,
    images: [{ url: u('photo-1509631179647-0177331693ae'), alt: 'Triko kalem elbise' }],
    colors: [
      { name: 'Camel', hex: '#B89B72', stock: full(5) },
      { name: 'Antrasit', hex: '#374151', stock: limited() },
    ],
  },
  {
    slug: 'gomlek-yaka-poplin-elbise',
    name: 'Gömlek Yaka Poplin Elbise',
    category: 'elbise',
    description:
      'Kuşaklı poplin gömlek elbise. Önden düğmeli, manşetli kol, midi boy. Ofis ve günlük kullanım için çok yönlü.',
    priceCents: 129_900,
    salesCount: 58,
    ageDays: 14,
    images: [{ url: u('photo-1525507119028-ed4c629a60a3'), alt: 'Gömlek yaka poplin elbise' }],
    colors: [
      { name: 'Beyaz', hex: '#F5F5F5', stock: full(8) },
      { name: 'Açık Mavi', hex: '#BFD7EA', stock: full(6) },
    ],
  },

  // ---- Pantolon & Jean ----
  {
    slug: 'straight-fit-jean',
    name: 'Straight Fit Jean',
    category: 'pantolon',
    description:
      'Rijit denim, orta bel, düz paça. Zamanla vücuda uyum sağlayan klasik beş cepli jean.',
    priceCents: 119_900,
    isFeatured: true,
    salesCount: 150,
    ageDays: 70,
    images: [
      { url: u('photo-1541099649105-f69ad21f3246'), alt: 'Straight fit jean' },
      { url: u('photo-1542272604-787c3835535d'), alt: 'Jean detay' },
    ],
    colors: [
      { name: 'Koyu İndigo', hex: '#1E3A5F', stock: full(12) },
      { name: 'Açık Mavi', hex: '#8FB3D9', stock: full(8) },
    ],
  },
  {
    slug: 'chino-pantolon',
    name: 'Chino Pantolon',
    category: 'pantolon',
    description:
      'Streç pamuklu gabardin, slim fit chino. Yan cepler, arka pervazlı cepler. Gömlek ve tişörtle kolay kombin.',
    priceCents: 99_900,
    compareAtPriceCents: 129_900,
    salesCount: 88,
    ageDays: 45,
    images: [{ url: u('photo-1473966968600-fa801b869a1a'), alt: 'Chino pantolon' }],
    colors: [
      { name: 'Bej', hex: '#D6C3A1', stock: full(10) },
      { name: 'Lacivert', hex: '#1F2A44', stock: full(9) },
      { name: 'Haki', hex: '#6B7D4F', stock: limited() },
    ],
  },
  {
    slug: 'yuksek-bel-wide-leg-pantolon',
    name: 'Yüksek Bel Wide Leg Pantolon',
    category: 'pantolon',
    description:
      'Dökümlü kumaş, yüksek bel, geniş paça. Önden pili detaylı, kemer köprülü. Zarif ve rahat.',
    priceCents: 109_900,
    isNew: true,
    salesCount: 44,
    ageDays: 5,
    images: [{ url: u('photo-1594938298603-c8148c4b4a9a'), alt: 'Yüksek bel wide leg pantolon' }],
    colors: [
      { name: 'Siyah', hex: '#111111', stock: full(7) },
      { name: 'Krem', hex: '#F3EDE0', stock: noXXL(6) },
    ],
  },
  {
    slug: 'kargo-pantolon',
    name: 'Kargo Pantolon',
    category: 'pantolon',
    description:
      'Dayanıklı pamuklu twill, yanlarda körüklü cepler, paça ayarlı. Şehir ve doğa için fonksiyonel.',
    priceCents: 104_900,
    salesCount: 36,
    ageDays: 22,
    images: [{ url: u('photo-1506629082955-511b1aa562c8'), alt: 'Kargo pantolon' }],
    colors: [
      { name: 'Haki', hex: '#6B7D4F', stock: full(8) },
      { name: 'Siyah', hex: '#111111', stock: full(5) },
    ],
  },

  // ---- Ceket & Mont ----
  {
    slug: 'deri-biker-ceket',
    name: 'Deri Biker Ceket',
    category: 'dis-giyim',
    description:
      'Gerçek kuzu derisi, asimetrik fermuar, kapitone omuz detayı. İç astar polyester. Yıllarca giyilecek bir klasik.',
    priceCents: 549_900,
    compareAtPriceCents: 649_900,
    isFeatured: true,
    salesCount: 25,
    ageDays: 50,
    images: [
      { url: u('photo-1551028719-00167b16eac5'), alt: 'Deri biker ceket' },
      { url: u('photo-1520975954732-35dd22299614'), alt: 'Deri ceket detay' },
    ],
    colors: [{ name: 'Siyah', hex: '#111111', stock: noXXL(4) }],
  },
  {
    slug: 'yunlu-oversize-palto',
    name: 'Yünlü Oversize Palto',
    category: 'dis-giyim',
    description:
      'Yün karışımlı kumaş, oversize kalıp, kruvaze kapama. Omuz düşük, uzun boy. Soğuk günlerde zarafet.',
    priceCents: 399_900,
    isNew: true,
    salesCount: 31,
    ageDays: 3,
    images: [{ url: u('photo-1544022613-e87ca75a784a'), alt: 'Yünlü oversize palto' }],
    colors: [
      { name: 'Camel', hex: '#B89B72', stock: full(4) },
      { name: 'Gri', hex: '#6B7280', stock: limited() },
    ],
  },
  {
    slug: 'kapitone-sisme-mont',
    name: 'Kapitone Şişme Mont',
    category: 'dis-giyim',
    description:
      'Su itici dış yüzey, geri dönüştürülmüş elyaf dolgu, kapüşonlu. Hafif ve sıcak tutar; katlanarak çantada taşınabilir.',
    priceCents: 249_900,
    compareAtPriceCents: 299_900,
    salesCount: 54,
    ageDays: 28,
    images: [{ url: u('photo-1611312449408-fcece27cdbb7'), alt: 'Kapitone şişme mont' }],
    colors: [
      { name: 'Siyah', hex: '#111111', stock: full(7) },
      { name: 'Zeytin', hex: '#4D5D3A', stock: full(5) },
    ],
  },
  {
    slug: 'denim-ceket',
    name: 'Denim Ceket',
    category: 'dis-giyim',
    description:
      'Klasik trucker kesim, rijit denim, metal düğmeler. Mevsim geçişlerinin vazgeçilmezi.',
    priceCents: 159_900,
    salesCount: 72,
    ageDays: 65,
    images: [{ url: u('photo-1576995853123-5a10305d93c0'), alt: 'Denim ceket' }],
    colors: [
      { name: 'Orta Mavi', hex: '#4A74A8', stock: full(9) },
      { name: 'Siyah', hex: '#111111', stock: noXXL(6) },
    ],
  },

  // ---- Triko & Kazak ----
  {
    slug: 'merino-yun-bogazli-kazak',
    name: 'Merino Yün Boğazlı Kazak',
    category: 'triko',
    description:
      '%100 merino yünü, ince örgü, balıkçı yaka. Kaşındırmaz, ısı dengeleyici. Ceket altına uyumlu ince yapı.',
    priceCents: 189_900,
    isFeatured: true,
    salesCount: 98,
    ageDays: 33,
    images: [
      { url: u('photo-1576871337622-98d48d1cf531'), alt: 'Merino yün boğazlı kazak' },
      { url: u('photo-1578587018452-892bacefd3f2'), alt: 'Merino kazak detay' },
    ],
    colors: [
      { name: 'Antrasit', hex: '#374151', stock: full(8) },
      { name: 'Camel', hex: '#B89B72', stock: full(6) },
      { name: 'Ekru', hex: '#EAE4D3', stock: limited() },
    ],
  },
  {
    slug: 'sac-orgu-kalin-kazak',
    name: 'Saç Örgü Kalın Kazak',
    category: 'triko',
    description:
      'Kalın saç örgü dokusu, bisiklet yaka, rahat kalıp. Yün karışımlı ipliğiyle sıcacık.',
    priceCents: 169_900,
    compareAtPriceCents: 199_900,
    salesCount: 41,
    ageDays: 12,
    images: [{ url: u('photo-1584370848010-d7fe6bc767ec'), alt: 'Saç örgü kalın kazak' }],
    colors: [
      { name: 'Krem', hex: '#F3EDE0', stock: full(6) },
      { name: 'Füme', hex: '#4B5563', stock: full(5) },
    ],
  },
  {
    slug: 'pamuklu-hirka',
    name: 'Pamuklu Hırka',
    category: 'triko',
    description:
      'Pamuklu ince örgü, V yaka, önden düğmeli hırka. Katmanlamak için hafif ve pratik.',
    priceCents: 129_900,
    isNew: true,
    salesCount: 29,
    ageDays: 7,
    images: [{ url: u('photo-1548126032-079a0fb0099d'), alt: 'Pamuklu hırka' }],
    colors: [
      { name: 'Bej', hex: '#D6C3A1', stock: full(7) },
      { name: 'Lacivert', hex: '#1F2A44', stock: noXXL(5) },
    ],
  },
  {
    slug: 'kapusonlu-sweatshirt',
    name: 'Kapüşonlu Sweatshirt',
    category: 'triko',
    description:
      'Şardonlu üç iplik pamuklu kumaş, kanguru cep, ayarlanabilir kapüşon. Günlük rahatlık için.',
    priceCents: 89_900,
    salesCount: 120,
    ageDays: 55,
    images: [
      { url: u('photo-1556821840-3a63f95609a7'), alt: 'Kapüşonlu sweatshirt' },
      { url: u('photo-1617137968427-85924c800a22'), alt: 'Sweatshirt detay' },
    ],
    colors: [
      { name: 'Gri Melanj', hex: '#9CA3AF', stock: full(12) },
      { name: 'Siyah', hex: '#111111', stock: full(10) },
      { name: 'Ekru', hex: '#EAE4D3', stock: full(6) },
    ],
  },
];

export function buildSku(productSlug: string, color: string, size: string): string {
  const base = productSlug
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8);
  const col = color
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 3);
  return `${base}-${col}-${size}`;
}
