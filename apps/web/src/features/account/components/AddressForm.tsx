import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

export interface AddressFormValues {
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  postalCode?: string;
  line: string;
  isDefault?: boolean;
}

export const emptyAddress: AddressFormValues = { title: '', firstName: '', lastName: '', phone: '', city: '', district: '', postalCode: '', line: '', isDefault: false };

/**
 * Adres alanları. RHF `register` ile çalışır; `prefix` ile iç içe form alanlarına (ör. checkout) bağlanabilir.
 */
export function AddressFields<T extends Record<string, unknown>>({
  register,
  errors,
  prefix = '',
  showTitle = true,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: FieldErrors<T> | FieldErrors<AddressFormValues> | undefined;
  prefix?: string;
  showTitle?: boolean;
}) {
  const e = (errors ?? {}) as Record<string, { message?: string } | undefined>;
  const name = (k: keyof AddressFormValues) => `${prefix}${String(k)}`;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {showTitle && <Input label="Adres başlığı" placeholder="Ev, İş…" containerClassName="sm:col-span-2" {...register(name('title'))} error={e.title?.message} />}
      <Input label="Ad" autoComplete="given-name" {...register(name('firstName'))} error={e.firstName?.message} />
      <Input label="Soyad" autoComplete="family-name" {...register(name('lastName'))} error={e.lastName?.message} />
      <Input label="Telefon" type="tel" autoComplete="tel" placeholder="05xx xxx xx xx" containerClassName="sm:col-span-2" {...register(name('phone'))} error={e.phone?.message} />
      <Input label="İl" autoComplete="address-level1" {...register(name('city'))} error={e.city?.message} />
      <Input label="İlçe" autoComplete="address-level2" {...register(name('district'))} error={e.district?.message} />
      <Input label="Posta kodu (isteğe bağlı)" inputMode="numeric" autoComplete="postal-code" {...register(name('postalCode'))} error={e.postalCode?.message} />
      <Textarea label="Açık adres" rows={3} autoComplete="street-address" containerClassName="sm:col-span-2" placeholder="Mahalle, sokak, bina ve daire no" {...register(name('line'))} error={e.line?.message} />
    </div>
  );
}
