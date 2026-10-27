import { useEffect, useMemo, useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Banknote, Check, ChevronLeft, CreditCard, Landmark, Lock, Truck } from 'lucide-react';
import type { CreateOrderInput, PaymentMethod } from '@shop/shared';
import { formatCents, PAYMENT_METHOD_LABELS } from '@shop/shared';
import { CartSummary } from '@/components/cart/CartSummary';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { AddressFields } from '@/features/account/components/AddressForm';
import { useAddresses } from '@/features/account/useAddresses';
import { useCart } from '@/features/cart/useCart';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getErrorMessage, isApiError } from '@/lib/api-client';
import { cn, maskCardNumber, newIdempotencyKey } from '@/lib/utils';
import { orderService } from '@/services/order.service';
import { useAuthStore, selectIsAuthenticated } from '@/store/auth.store';
import { toast } from '@/store/ui.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-client';
import { validatePaymentStep, validateShippingStep, type CheckoutFormValues } from '../checkout.schema';

const STEPS = [
  { id: 1, label: 'Teslimat' },
  { id: 2, label: 'Ödeme' },
  { id: 3, label: 'Onay' },
] as const;

const TEST_CARDS = [
  { number: '4111 1111 1111 1111', label: 'Başarılı ödeme' },
  { number: '4000 0000 0000 0002', label: 'Reddedilen kart' },
];

export default function CheckoutPage() {
  usePageTitle('Ödeme');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const { items, summary, isLoading: cartLoading, hasBlockingWarnings, isGuest } = useCart();
  const guestLines = useGuestCartStore((s) => s.lines);
  const clearGuestCart = useGuestCartStore((s) => s.clear);
  const { addresses, isLoading: addressesLoading } = useAddresses();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CheckoutFormValues>({
    defaultValues: {
      guestEmail: '',
      addressMode: isAuthenticated ? 'saved' : 'new',
      addressId: '',
      address: { title: '', firstName: '', lastName: '', phone: '', city: '', district: '', postalCode: '', line: '' },
      paymentMethod: undefined,
      card: { holderName: '', number: '', expMonth: undefined, expYear: undefined, cvc: '' },
      note: '',
    },
  });
  const { register, watch, setValue, setError, clearErrors, getValues, formState } = form;
  const { errors } = formState;
  const addressMode = watch('addressMode');
  const addressId = watch('addressId');
  const paymentMethod = watch('paymentMethod');
  const cardNumber = watch('card.number') ?? '';

  // Kayıtlı kullanıcı: adresler yüklenince varsayılanı seç; adres yoksa "yeni" moda geç
  useEffect(() => {
    if (!isAuthenticated || addressesLoading) return;
    if (addresses.length === 0) {
      setValue('addressMode', 'new');
      if (user) {
        setValue('address.firstName', user.firstName);
        setValue('address.lastName', user.lastName);
        if (user.phone) setValue('address.phone', user.phone);
      }
    } else if (!getValues('addressId')) {
      setValue('addressMode', 'saved');
      setValue('addressId', (addresses.find((a) => a.isDefault) ?? addresses[0])!.id);
    }
  }, [isAuthenticated, addresses, addressesLoading, setValue, getValues, user]);

  const selectedAddress = useMemo(() => addresses.find((a) => a.id === addressId), [addresses, addressId]);

  const applyIssues = (issues: { path: string; message: string }[]) => {
    for (const i of issues) setError(i.path as Path<CheckoutFormValues>, { type: 'manual', message: i.message });
    const first = issues[0];
    if (first) {
      const el = document.querySelector<HTMLElement>(`[name="${first.path}"]`);
      el?.focus();
    }
  };

  const goNext = () => {
    clearErrors();
    const values = getValues();
    const issues = step === 1 ? validateShippingStep(values, isGuest) : validatePaymentStep(values);
    if (issues.length) return applyIssues(issues);
    setStep((s) => (s === 1 ? 2 : 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildInput = (): CreateOrderInput => {
    const v = getValues();
    const shippingAddress =
      v.addressMode === 'saved' && v.addressId
        ? { addressId: v.addressId }
        : {
            title: v.address?.title || undefined,
            firstName: v.address?.firstName ?? '',
            lastName: v.address?.lastName ?? '',
            phone: v.address?.phone ?? '',
            city: v.address?.city ?? '',
            district: v.address?.district ?? '',
            postalCode: v.address?.postalCode || undefined,
            line: v.address?.line ?? '',
          };
    const input: CreateOrderInput = {
      shippingAddress,
      paymentMethod: v.paymentMethod as PaymentMethod,
      note: v.note || undefined,
    };
    if (isGuest) {
      input.guestEmail = v.guestEmail;
      input.items = guestLines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
    }
    if (v.paymentMethod === 'CREDIT_CARD' && v.card) {
      input.card = {
        holderName: v.card.holderName ?? '',
        number: (v.card.number ?? '').replace(/\s/g, ''),
        expMonth: Number(v.card.expMonth),
        expYear: Number(v.card.expYear),
        cvc: v.card.cvc ?? '',
      };
    }
    return input;
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await orderService.create(buildInput(), idempotencyKey);
      // Kart bilgisi formdan temizlenir; hiçbir yerde saklanmaz
      setValue('card', { holderName: '', number: '', expMonth: undefined, expYear: undefined, cvc: '' });
      if (isGuest) clearGuestCart();
      else void qc.invalidateQueries({ queryKey: queryKeys.cart });
      navigate(`/siparis-tamamlandi/${order.orderNumber}`, { replace: true, state: { order } });
    } catch (e) {
      const msg = getErrorMessage(e);
      if (isApiError(e) && e.code === 'PAYMENT_FAILED') {
        // Ödeme reddedildi: sipariş iptal edildi; yeni deneme yeni sipariş olmalı
        setIdempotencyKey(newIdempotencyKey());
        setSubmitError(`${msg} Kart bilgilerinizi kontrol edip tekrar deneyin.`);
        setStep(2);
      } else if (isApiError(e) && e.code === 'OUT_OF_STOCK') {
        setIdempotencyKey(newIdempotencyKey());
        setSubmitError(msg);
        toast.error('Stok yetersiz', 'Sepetiniz güncellendi. Lütfen kontrol edin.');
        void qc.invalidateQueries({ queryKey: ['cart'] });
      } else if (isApiError(e) && e.code === 'VALIDATION_ERROR' && e.details?.length) {
        setIdempotencyKey(newIdempotencyKey());
        applyIssues(e.details.map((d) => ({ path: d.path.startsWith('shippingAddress') ? d.path.replace('shippingAddress', 'address') : d.path, message: d.message })));
        setSubmitError(msg);
        setStep(1);
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === 'loading' || authStatus === 'idle' || cartLoading || (isAuthenticated && addressesLoading)) return <PageSpinner />;

  if (items.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Sepetiniz boş</h1>
        <p className="mt-2 text-sm text-secondary">Ödeme adımına geçmek için sepetinize ürün ekleyin.</p>
        <Link to="/urunler" className="mt-6 inline-block">
          <Button>Ürünlere Göz At</Button>
        </Link>
      </div>
    );
  }

  if (hasBlockingWarnings) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Sepetinizde tükenen ürün var</h1>
        <p className="mt-2 text-sm text-secondary">Devam etmeden önce tükenen ürünleri sepetinizden kaldırın.</p>
        <Link to="/sepet" className="mt-6 inline-block">
          <Button>Sepete Dön</Button>
        </Link>
      </div>
    );
  }

  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1).padStart(2, '0') }));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => ({ value: String(thisYear + i), label: String(thisYear + i) }));

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-semibold">Ödeme</h1>
        <Link to="/sepet" className="hidden items-center gap-1 text-sm text-secondary hover:text-primary sm:flex">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Sepete dön
        </Link>
      </div>

      {/* Adım göstergesi */}
      <ol className="mt-6 flex items-center gap-2 text-sm" aria-label="Ödeme adımları">
        {STEPS.map((s, i) => {
          const done = step > s.id;
          const active = step === s.id;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium',
                  done ? 'border-primary bg-primary text-surface' : active ? 'border-primary text-primary' : 'border-border text-secondary',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : s.id}
              </span>
              <span className={cn(active ? 'font-medium text-primary' : 'text-secondary')}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-border sm:w-12" aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <form
          className="space-y-8"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) goNext();
            else void submit();
          }}
        >
          {/* ADIM 1: Teslimat */}
          {step === 1 && (
            <section className="space-y-6" aria-labelledby="step-shipping">
              <h2 id="step-shipping" className="flex items-center gap-2 text-lg font-semibold">
                <Truck className="h-5 w-5" aria-hidden /> Teslimat Bilgileri
              </h2>

              {isGuest && (
                <div className="rounded-lg border border-border p-5">
                  <Input label="E-posta" type="email" autoComplete="email" hint="Sipariş onayı ve takip bilgisi bu adrese gönderilir." {...register('guestEmail')} error={errors.guestEmail?.message} />
                  <p className="mt-3 text-xs text-secondary">
                    Hesabınız var mı?{' '}
                    <Link to="/giris" state={{ from: '/odeme' }} className="underline underline-offset-4">
                      Giriş yapın
                    </Link>
                  </p>
                </div>
              )}

              {isAuthenticated && addresses.length > 0 && (
                <div className="space-y-3">
                  <RadioGroup
                    name="addressMode"
                    label="Teslimat adresi"
                    value={addressMode}
                    onChange={(v) => setValue('addressMode', v)}
                    orientation="horizontal"
                    options={[
                      { value: 'saved', label: 'Kayıtlı adreslerim' },
                      { value: 'new', label: 'Yeni adres' },
                    ]}
                  />
                  {addressMode === 'saved' && (
                    <div>
                      <RadioGroup
                        name="addressId"
                        value={addressId ?? null}
                        onChange={(v) => {
                          setValue('addressId', v);
                          clearErrors('addressId');
                        }}
                        variant="card"
                        error={errors.addressId?.message}
                        options={addresses.map((a) => ({
                          value: a.id,
                          label: (
                            <span className="flex items-center gap-2">
                              {a.title}
                              {a.isDefault && <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-secondary">Varsayılan</span>}
                            </span>
                          ),
                          description: `${a.firstName} ${a.lastName} · ${a.line}, ${a.district}/${a.city} · ${a.phone}`,
                        }))}
                      />
                    </div>
                  )}
                </div>
              )}

              {addressMode === 'new' && (
                <div className="rounded-lg border border-border p-5">
                  <AddressFields register={register} errors={errors.address as never} prefix="address." showTitle={isAuthenticated} />
                </div>
              )}

              <Textarea label="Sipariş notu (isteğe bağlı)" rows={2} placeholder="Kapıcıya bırakılabilir, aramadan gelmeyin vb." {...register('note')} error={errors.note?.message} />
            </section>
          )}

          {/* ADIM 2: Ödeme */}
          {step === 2 && (
            <section className="space-y-6" aria-labelledby="step-payment">
              <h2 id="step-payment" className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="h-5 w-5" aria-hidden /> Ödeme Yöntemi
              </h2>
              <RadioGroup<PaymentMethod>
                name="paymentMethod"
                value={paymentMethod ?? null}
                onChange={(v) => {
                  setValue('paymentMethod', v);
                  clearErrors('paymentMethod');
                  setSubmitError(null);
                }}
                variant="card"
                error={errors.paymentMethod?.message}
                options={[
                  { value: 'CREDIT_CARD', label: PAYMENT_METHOD_LABELS.CREDIT_CARD, description: 'Visa, Mastercard, Troy. 3D Secure ile güvenli ödeme.', icon: <CreditCard className="h-5 w-5" aria-hidden /> },
                  { value: 'COD', label: PAYMENT_METHOD_LABELS.COD, description: 'Teslimatta nakit veya kartla ödeyin.', icon: <Banknote className="h-5 w-5" aria-hidden /> },
                  { value: 'BANK_TRANSFER', label: PAYMENT_METHOD_LABELS.BANK_TRANSFER, description: 'Banka bilgileri sipariş sonrasında gösterilir; ödeme onaylanınca kargoya verilir.', icon: <Landmark className="h-5 w-5" aria-hidden /> },
                ]}
              />

              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-4 rounded-lg border border-border p-5">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Lock className="h-3.5 w-3.5" aria-hidden /> Kart bilgileriniz şifreli bağlantıyla iletilir ve sunucularımızda saklanmaz.
                  </div>
                  <Input label="Kart üzerindeki isim" autoComplete="cc-name" {...register('card.holderName')} error={errors.card?.holderName?.message} />
                  <Input
                    label="Kart numarası"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setValue('card.number', maskCardNumber(e.target.value))}
                    name="card.number"
                    error={errors.card?.number?.message}
                    data-testid="card-number"
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Select label="Ay" options={months} placeholder="AA" {...register('card.expMonth')} error={errors.card?.expMonth?.message} />
                    <Select label="Yıl" options={years} placeholder="YYYY" {...register('card.expYear')} error={errors.card?.expYear?.message} />
                    <Input label="CVC" inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="•••" {...register('card.cvc')} error={errors.card?.cvc?.message} />
                  </div>
                  <details className="rounded-md bg-surface-muted px-3 py-2 text-xs text-secondary">
                    <summary className="cursor-pointer select-none font-medium text-primary">Test kartları (demo ödeme)</summary>
                    <ul className="mt-2 space-y-1">
                      {TEST_CARDS.map((c) => (
                        <li key={c.number} className="flex items-center justify-between gap-2">
                          <span className="font-mono">{c.number}</span>
                          <button type="button" className="underline underline-offset-4" onClick={() => setValue('card.number', c.number)}>
                            {c.label} — kullan
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">Bu bir demo ödeme sağlayıcısıdır; gerçek kart işlemi yapılmaz.</p>
                  </details>
                </div>
              )}

              {paymentMethod === 'BANK_TRANSFER' && (
                <p className="rounded-md bg-surface-muted px-4 py-3 text-sm text-secondary">
                  Siparişiniz oluşturulduktan sonra banka hesap bilgileri ve sipariş referansı gösterilecektir. Ödemeniz 2 iş günü içinde ulaşmazsa sipariş iptal edilir.
                </p>
              )}
            </section>
          )}

          {/* ADIM 3: Onay */}
          {step === 3 && (
            <section className="space-y-6" aria-labelledby="step-review">
              <h2 id="step-review" className="text-lg font-semibold">
                Siparişi Onayla
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewCard title="Teslimat adresi" onEdit={() => setStep(1)}>
                  {addressMode === 'saved' && selectedAddress ? (
                    <>
                      <p className="font-medium">
                        {selectedAddress.firstName} {selectedAddress.lastName}
                      </p>
                      <p>{selectedAddress.line}</p>
                      <p>
                        {selectedAddress.district} / {selectedAddress.city} {selectedAddress.postalCode ?? ''}
                      </p>
                      <p>{selectedAddress.phone}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">
                        {getValues('address.firstName')} {getValues('address.lastName')}
                      </p>
                      <p>{getValues('address.line')}</p>
                      <p>
                        {getValues('address.district')} / {getValues('address.city')} {getValues('address.postalCode')}
                      </p>
                      <p>{getValues('address.phone')}</p>
                    </>
                  )}
                  {isGuest && <p className="mt-1 text-secondary">{getValues('guestEmail')}</p>}
                </ReviewCard>
                <ReviewCard title="Ödeme yöntemi" onEdit={() => setStep(2)}>
                  <p className="font-medium">{paymentMethod ? PAYMENT_METHOD_LABELS[paymentMethod] : '—'}</p>
                  {paymentMethod === 'CREDIT_CARD' && <p className="text-secondary">Kart: •••• {cardNumber.replace(/\s/g, '').slice(-4)}</p>}
                  {getValues('note') && <p className="mt-2 text-secondary">Not: {getValues('note')}</p>}
                </ReviewCard>
              </div>
              <ul className="divide-y divide-border border-y border-border">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-4 py-3 text-sm">
                    <ProductImage src={it.imageUrl} alt={it.name} className="h-16 w-12 rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.name}</p>
                      <p className="text-xs text-secondary">
                        {it.size} · {it.color} · {it.quantity} adet
                      </p>
                    </div>
                    <span className="tabular-nums">{formatCents(it.lineTotalCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-secondary">
                “Siparişi Onayla” düğmesine basarak{' '}
                <Link to="/yardim/teslimat-iade" className="underline underline-offset-4">
                  mesafeli satış ve iade koşullarını
                </Link>{' '}
                kabul etmiş olursunuz.
              </p>
            </section>
          )}

          {submitError && (
            <p className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
              {submitError}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => (s === 3 ? 2 : 1))} leftIcon={<ChevronLeft className="h-4 w-4" />}>
                Geri
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" size="lg" loading={submitting} data-testid={step === 3 ? 'place-order' : 'checkout-next'}>
              {step === 3 ? `Siparişi Onayla · ${formatCents(summary.totalCents)}` : 'Devam Et'}
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-lg border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Sipariş Özeti</h2>
          <ul className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 text-sm">
                <ProductImage src={it.imageUrl} alt={it.name} className="h-14 w-11 rounded" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{it.name}</p>
                  <p className="text-xs text-secondary">
                    {it.size} · {it.quantity} adet
                  </p>
                </div>
                <span className="tabular-nums text-sm">{formatCents(it.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <CartSummary summary={summary} className="mt-5 border-t border-border pt-4" />
        </aside>
      </div>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-secondary">{title}</h3>
        <button type="button" onClick={onEdit} className="text-xs underline underline-offset-4">
          Düzenle
        </button>
      </div>
      <div className="mt-2 space-y-0.5">{children}</div>
    </div>
  );
}
