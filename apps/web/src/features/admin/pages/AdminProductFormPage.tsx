import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type Path } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, GripVertical, ImagePlus, Plus, Trash2, Wand2 } from 'lucide-react';
import type { z } from 'zod';
import { centsToLira, liraToCents, productInputSchema, SIZES, type ProductDetailDto, type ProductInput } from '@shop/shared';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState, PageSpinner } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getErrorMessage, isApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { slugify } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { toast } from '@/store/ui.store';
import { PageHeader } from '../components/AdminUi';

type FormValues = z.input<typeof productInputSchema>;

const COLOR_PRESETS = ['Siyah', 'Beyaz', 'Bej', 'Lacivert', 'Gri', 'Haki', 'Bordo', 'Krem', 'Kahverengi', 'Mavi'];

function toForm(p: ProductDetailDto): FormValues {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    priceCents: p.priceCents,
    compareAtPriceCents: p.compareAtPriceCents,
    categoryId: p.categoryId,
    status: p.status,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    images: p.images.map((i) => ({ id: i.id, imageUrl: i.imageUrl, altText: i.altText, sortOrder: i.sortOrder })),
    variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, colorHex: v.colorHex ?? '', stockQuantity: v.stockQuantity, priceOverrideCents: null, isActive: v.isActive })),
  };
}

const EMPTY: FormValues = {
  name: '',
  slug: '',
  description: '',
  priceCents: 0,
  compareAtPriceCents: null,
  categoryId: '',
  status: 'ACTIVE',
  isFeatured: false,
  isNew: true,
  images: [],
  variants: [{ size: 'M', color: '', colorHex: '', stockQuantity: 0, priceOverrideCents: null, isActive: true }],
};

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  usePageTitle(isEdit ? 'Yönetim · Ürünü Düzenle' : 'Yönetim · Yeni Ürün');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const categories = useQuery({ queryKey: queryKeys.admin.categories, queryFn: ({ signal }) => adminService.categories.list(signal) });
  const product = useQuery({ queryKey: queryKeys.admin.product(id ?? ''), queryFn: ({ signal }) => adminService.products.byId(id!, signal), enabled: isEdit });

  const form = useForm<FormValues>({ resolver: zodResolver(productInputSchema) as never, defaultValues: EMPTY });
  const { register, control, watch, setValue, formState, handleSubmit, reset, setError } = form;
  const { errors } = formState;
  const images = useFieldArray({ control, name: 'images' });
  const variants = useFieldArray({ control, name: 'variants' });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const name = watch('name');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product.data) reset(toForm(product.data));
  }, [product.data, reset]);

  useEffect(() => {
    if (!slugTouched && name) setValue('slug', slugify(name));
  }, [name, slugTouched, setValue]);

  const upload = useMutation({
    mutationFn: (file: File) => adminService.upload(file),
    onSuccess: (r) => images.append({ imageUrl: r.url, altText: name || '', sortOrder: images.fields.length }),
    onError: (e) => toast.error('Görsel yüklenemedi', getErrorMessage(e)),
  });

  const save = useMutation({
    mutationFn: (values: ProductInput) => (isEdit ? adminService.products.update(id!, values) : adminService.products.create(values)),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      void qc.invalidateQueries({ queryKey: ['products'] });
      void qc.invalidateQueries({ queryKey: ['home'] });
      qc.setQueryData(queryKeys.admin.product(p.id), p);
      toast.success(isEdit ? 'Ürün güncellendi' : 'Ürün oluşturuldu');
      if (!isEdit) navigate(`/admin/urunler/${p.id}`, { replace: true });
      else reset(toForm(p));
    },
    onError: (e) => {
      if (isApiError(e) && e.details?.length) {
        for (const d of e.details) setError(d.path as Path<FormValues>, { message: d.message });
      }
      toast.error('Kaydedilemedi', getErrorMessage(e));
    },
  });

  const onSubmit = handleSubmit((values) => save.mutate(values as ProductInput));

  const generateVariants = () => {
    const color = window.prompt('Hangi renk için tüm bedenler eklensin?', COLOR_PRESETS[0]);
    if (!color) return;
    const existing = new Set(variants.fields.map((v) => `${v.size}|${v.color.toLowerCase()}`));
    for (const size of SIZES) {
      if (!existing.has(`${size}|${color.toLowerCase()}`)) variants.append({ size, color, colorHex: '', stockQuantity: 10, priceOverrideCents: null, isActive: true });
    }
  };

  if (isEdit && product.isLoading) return <PageSpinner />;
  if (isEdit && (product.error || !product.data)) return <ErrorState error={product.error} title="Ürün bulunamadı" onRetry={() => void product.refetch()} />;

  const price = watch('priceCents');
  const compare = watch('compareAtPriceCents');

  return (
    <div>
      <Link to="/admin/urunler" className="mb-3 flex items-center gap-1 text-sm text-secondary hover:text-primary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Ürünler
      </Link>
      <form onSubmit={onSubmit} noValidate>
        <PageHeader
          title={isEdit ? (product.data?.name ?? 'Ürünü Düzenle') : 'Yeni Ürün'}
          actions={
            <>
              {isEdit && product.data?.status === 'ACTIVE' && (
                <Link to={`/urun/${product.data.slug}`} target="_blank" className="text-sm text-secondary underline-offset-4 hover:underline">
                  Mağazada gör
                </Link>
              )}
              <Button type="submit" loading={save.isPending} disabled={isEdit && !formState.isDirty}>
                {isEdit ? 'Kaydet' : 'Ürünü Oluştur'}
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Section title="Temel bilgiler">
              <Input label="Ürün adı" {...register('name')} error={errors.name?.message} />
              <Input
                label="Slug (URL)"
                hint="Yalnızca küçük harf, rakam ve tire"
                {...register('slug', { onChange: () => setSlugTouched(true) })}
                error={errors.slug?.message}
                rightElement={
                  <button type="button" className="text-xs underline underline-offset-4" onClick={() => { setValue('slug', slugify(name)); setSlugTouched(true); }}>
                    Üret
                  </button>
                }
              />
              <Textarea label="Açıklama" rows={6} {...register('description')} error={errors.description?.message} />
            </Section>

            <Section title="Görseller" description="İlk görsel kapak olarak kullanılır. JPEG/PNG/WebP, en fazla 5 MB.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.fields.map((f, i) => (
                  <div key={f.id} className="group relative rounded-md border border-border p-2">
                    <ProductImage src={f.imageUrl} alt={f.altText ?? ''} className="aspect-[4/5] w-full rounded" />
                    <Input label="Alt metin" hideLabel placeholder="Alt metin" containerClassName="mt-2" className="h-8 text-xs" {...register(`images.${i}.altText`)} />
                    <input type="hidden" {...register(`images.${i}.sortOrder`, { valueAsNumber: true })} value={i} />
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {i > 0 && (
                        <button type="button" className="rounded bg-surface/90 p-1 shadow" onClick={() => images.move(i, i - 1)} aria-label="Öne al">
                          <GripVertical className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button type="button" className="rounded bg-surface/90 p-1 text-danger shadow" onClick={() => images.remove(i)} aria-label="Görseli kaldır">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {i === 0 && <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] text-surface">Kapak</span>}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={upload.isPending}
                  className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-secondary hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <ImagePlus className="h-5 w-5" aria-hidden />
                  {upload.isPending ? 'Yükleniyor…' : 'Görsel yükle'}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload.mutate(f);
                    e.target.value = '';
                  }}
                />
              </div>
              <UrlAdder onAdd={(url) => images.append({ imageUrl: url, altText: name || '', sortOrder: images.fields.length })} />
              {errors.images?.message && <p className="error-text">{errors.images.message}</p>}
            </Section>

            <Section
              title="Varyantlar (beden × renk)"
              description="Her satır ayrı stok tutar. SKU boş bırakılırsa otomatik üretilir."
              actions={
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" leftIcon={<Wand2 className="h-3.5 w-3.5" />} onClick={generateVariants}>
                    Tüm bedenleri ekle
                  </Button>
                  <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => variants.append({ size: 'M', color: '', colorHex: '', stockQuantity: 0, priceOverrideCents: null, isActive: true })}>
                    Satır
                  </Button>
                </div>
              }
            >
              {errors.variants?.message && <p className="error-text">{errors.variants.message}</p>}
              {errors.variants?.root?.message && <p className="error-text">{errors.variants.root.message}</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-secondary">
                    <tr>
                      <th className="py-2 pr-2 font-medium">Beden</th>
                      <th className="py-2 pr-2 font-medium">Renk</th>
                      <th className="py-2 pr-2 font-medium">Renk kodu</th>
                      <th className="py-2 pr-2 font-medium">Stok</th>
                      <th className="py-2 pr-2 font-medium">SKU</th>
                      <th className="py-2 pr-2 font-medium">Aktif</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {variants.fields.map((f, i) => {
                      const ve = errors.variants?.[i];
                      return (
                        <tr key={f.id} className="align-top">
                          <td className="py-1.5 pr-2">
                            <Select label="Beden" hideLabel size="sm" options={SIZES.map((s) => ({ value: s, label: s }))} {...register(`variants.${i}.size`)} error={ve?.size?.message} containerClassName="w-20" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input label="Renk" hideLabel list="color-presets" className="h-9 text-sm" {...register(`variants.${i}.color`)} error={ve?.color?.message} containerClassName="w-32" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1">
                              <input type="color" aria-label="Renk seç" className="h-9 w-9 cursor-pointer rounded border border-border bg-surface p-0.5" value={watch(`variants.${i}.colorHex`) || '#000000'} onChange={(e) => setValue(`variants.${i}.colorHex`, e.target.value, { shouldDirty: true })} />
                              <Input label="Renk kodu" hideLabel placeholder="#000000" className="h-9 font-mono text-xs" {...register(`variants.${i}.colorHex`)} error={ve?.colorHex?.message} containerClassName="w-24" />
                            </div>
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input label="Stok" hideLabel type="number" min={0} className="h-9 text-sm" {...register(`variants.${i}.stockQuantity`)} error={ve?.stockQuantity?.message} containerClassName="w-20" />
                          </td>
                          <td className="py-1.5 pr-2">
                            <Input label="SKU" hideLabel placeholder="otomatik" className="h-9 font-mono text-xs" {...register(`variants.${i}.sku`)} error={ve?.sku?.message} containerClassName="w-36" />
                          </td>
                          <td className="py-1.5 pr-2 pt-3">
                            <Checkbox aria-label="Aktif" {...register(`variants.${i}.isActive`)} />
                          </td>
                          <td className="py-1.5 pt-2">
                            <button type="button" className="rounded p-1.5 text-secondary hover:text-danger disabled:opacity-30" onClick={() => variants.remove(i)} disabled={variants.fields.length === 1} aria-label="Varyantı sil">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <datalist id="color-presets">
                {COLOR_PRESETS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Section>
          </div>

          <div className="space-y-6">
            <Section title="Yayın">
              <Select
                label="Durum"
                options={[
                  { value: 'ACTIVE', label: 'Yayında' },
                  { value: 'DRAFT', label: 'Taslak' },
                  { value: 'ARCHIVED', label: 'Arşiv' },
                ]}
                {...register('status')}
                error={errors.status?.message}
              />
              <Select
                label="Kategori"
                placeholder="Kategori seçin"
                options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
                {...register('categoryId')}
                error={errors.categoryId?.message}
              />
              <Checkbox label="Öne çıkan ürün" {...register('isFeatured')} />
              <Checkbox label="Yeni sezon etiketi" {...register('isNew')} />
            </Section>

            <Section title="Fiyat">
              <PriceInput label="Satış fiyatı (₺)" value={price ?? 0} onChange={(c) => setValue('priceCents', c ?? 0, { shouldDirty: true, shouldValidate: true })} error={errors.priceCents?.message} />
              <PriceInput
                label="Önceki fiyat (₺, isteğe bağlı)"
                value={compare ?? null}
                nullable
                onChange={(c) => setValue('compareAtPriceCents', c, { shouldDirty: true, shouldValidate: true })}
                error={errors.compareAtPriceCents?.message}
                hint="İndirim göstermek için satış fiyatından büyük olmalıdır"
              />
            </Section>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-secondary">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function PriceInput({ label, value, onChange, error, hint, nullable }: { label: string; value: number | null | undefined; onChange: (cents: number | null) => void; error?: string; hint?: string; nullable?: boolean }) {
  const [text, setText] = useState(value ? String(centsToLira(value)) : '');
  useEffect(() => {
    setText(value ? String(centsToLira(value)) : '');
  }, [value]);
  return (
    <Input
      label={label}
      inputMode="decimal"
      value={text}
      hint={hint}
      error={error}
      onChange={(e) => {
        const t = e.target.value.replace(',', '.');
        setText(t);
        if (t.trim() === '') return onChange(nullable ? null : 0);
        const n = Number(t);
        if (!Number.isNaN(n)) onChange(liraToCents(n));
      }}
    />
  );
}

function UrlAdder({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');
  return (
    <div className="flex gap-2">
      <Input label="Görsel URL" hideLabel placeholder="https://… (URL ile ekle)" value={url} onChange={(e) => setUrl(e.target.value)} containerClassName="flex-1" className="h-9 text-sm" />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!/^https?:\/\//.test(url)}
        onClick={() => {
          onAdd(url.trim());
          setUrl('');
        }}
      >
        Ekle
      </Button>
    </div>
  );
}
