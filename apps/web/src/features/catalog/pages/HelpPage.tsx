import { Navigate, useParams } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { usePageTitle } from '@/hooks/usePageTitle';

const topics: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
  'teslimat-iade': {
    title: 'Teslimat ve İade',
    sections: [
      { heading: 'Teslimat süresi', body: 'Siparişler ödeme onayından sonra 1–3 iş günü içinde kargoya verilir. Kargo takip numarası sipariş detay sayfanızda görüntülenir.' },
      { heading: 'Kargo ücreti', body: '1.500 TL ve üzeri siparişlerde kargo ücretsizdir. Bu tutarın altındaki siparişlerde 79,90 TL kargo ücreti uygulanır.' },
      { heading: 'İade koşulları', body: 'Teslimattan itibaren 14 gün içinde, kullanılmamış ve etiketli ürünleri iade edebilirsiniz. İade talebinizi sipariş detayından oluşturabilirsiniz.' },
    ],
  },
  'beden-rehberi': {
    title: 'Beden Rehberi',
    sections: [
      { heading: 'Üst giyim (cm)', body: 'S: Göğüs 88–92 · M: 96–100 · L: 104–108 · XL: 112–116 · XXL: 120–124' },
      { heading: 'Alt giyim (cm)', body: 'S: Bel 72–76 · M: 80–84 · L: 88–92 · XL: 96–100 · XXL: 104–108' },
      { heading: 'Nasıl ölçmeliyim?', body: 'Göğüs ölçüsünü göğsün en geniş yerinden, bel ölçüsünü belin en ince yerinden mezura ile yatay olarak alın.' },
    ],
  },
  sss: {
    title: 'Sıkça Sorulan Sorular',
    sections: [
      { heading: 'Siparişimi nasıl takip ederim?', body: 'Hesabım › Siparişlerim sayfasından sipariş durumunu ve kargo takip numarasını görebilirsiniz.' },
      { heading: 'Hangi ödeme yöntemleri geçerli?', body: 'Kredi/banka kartı, kapıda ödeme ve havale/EFT seçenekleri mevcuttur. Bu demo mağazada kart ödemeleri test ortamında işlenir.' },
      { heading: 'Siparişimi iptal edebilir miyim?', body: 'Sipariş "Beklemede" veya "Onaylandı" durumundayken sipariş detayından iptal edebilirsiniz.' },
    ],
  },
  iletisim: {
    title: 'İletişim',
    sections: [
      { heading: 'E-posta', body: 'destek@atolye.example — Hafta içi 09:00–18:00 arasında yanıt veriyoruz.' },
      { heading: 'Adres', body: 'Atölye Giyim Ltd. Şti. — Bu bir demo mağazadır.' },
    ],
  },
};

export default function HelpPage() {
  const { topic = '' } = useParams<{ topic: string }>();
  const page = topics[topic];
  usePageTitle(page?.title);
  if (!page) return <Navigate to="/404" replace />;
  return (
    <div className="container-page py-6 sm:py-10">
      <Breadcrumb items={[{ label: 'Yardım' }, { label: page.title }]} />
      <h1 className="mt-4 font-display text-4xl font-semibold">{page.title}</h1>
      <div className="mt-8 max-w-2xl space-y-8">
        {page.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <p className="mt-2 text-secondary">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
