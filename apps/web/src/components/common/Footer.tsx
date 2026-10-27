import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { NewsletterForm } from './NewsletterForm';

const columns = [
  {
    title: 'Alışveriş',
    links: [
      { label: 'Tüm Ürünler', to: '/urunler' },
      { label: 'Yeni Gelenler', to: '/urunler?isNew=true&sort=newest' },
      { label: 'İndirimler', to: '/urunler?onSale=true' },
      { label: 'Favorilerim', to: '/favoriler' },
    ],
  },
  {
    title: 'Hesap',
    links: [
      { label: 'Giriş Yap', to: '/giris' },
      { label: 'Kayıt Ol', to: '/kayit' },
      { label: 'Siparişlerim', to: '/hesap/siparisler' },
      { label: 'Adreslerim', to: '/hesap/adresler' },
    ],
  },
  {
    title: 'Yardım',
    links: [
      { label: 'Teslimat ve İade', to: '/yardim/teslimat-iade' },
      { label: 'Beden Rehberi', to: '/yardim/beden-rehberi' },
      { label: 'Sıkça Sorulan Sorular', to: '/yardim/sss' },
      { label: 'İletişim', to: '/yardim/iletisim' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-secondary">
            Sade kesimler, kaliteli kumaşlar ve zamansız parçalar. Her gün giyilebilen, uzun ömürlü bir gardırop için.
          </p>
          <div className="mt-6">
            <NewsletterForm />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-secondary hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col items-start justify-between gap-3 py-6 text-xs text-secondary sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Atölye Giyim. Tüm hakları saklıdır.</p>
          <p>Bu bir demo mağazadır; ödeme işlemleri test ortamında gerçekleştirilir.</p>
        </div>
      </div>
    </footer>
  );
}
