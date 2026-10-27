import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Plus, Star } from 'lucide-react';
import type { z } from 'zod';
import { addressInputSchema, type AddressDto, type AddressInput } from '@shop/shared';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { applyServerErrors } from '@/lib/forms';
import { AddressFields, emptyAddress } from '../components/AddressForm';
import { useAddresses } from '../useAddresses';

type FormValues = z.input<typeof addressInputSchema>;

export default function AddressesPage() {
  usePageTitle('Adreslerim');
  const { addresses, isLoading, error, refetch, create, update, remove, setDefault } = useAddresses();
  const [editing, setEditing] = useState<AddressDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AddressDto | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Adreslerim</h2>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
          Yeni Adres
        </Button>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : addresses.length === 0 ? (
          <EmptyState icon={<MapPin className="h-6 w-6" aria-hidden />} title="Kayıtlı adresiniz yok" description="Hızlı ödeme için teslimat adreslerinizi kaydedin." action={<Button onClick={() => setEditing('new')}>Adres Ekle</Button>} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <li key={a.id} className="flex flex-col rounded-lg border border-border p-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{a.title}</p>
                  {a.isDefault && (
                    <span className="flex items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                      <Star className="h-3 w-3" aria-hidden /> Varsayılan
                    </span>
                  )}
                </div>
                <p className="mt-2">
                  {a.firstName} {a.lastName}
                </p>
                <p className="text-secondary">{a.line}</p>
                <p className="text-secondary">
                  {a.district} / {a.city} {a.postalCode ?? ''}
                </p>
                <p className="text-secondary">{a.phone}</p>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                    Düzenle
                  </Button>
                  {!a.isDefault && (
                    <Button size="sm" variant="ghost" onClick={() => setDefault.mutate(a.id)} loading={setDefault.isPending && setDefault.variables === a.id}>
                      Varsayılan yap
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="ml-auto text-danger" onClick={() => setDeleting(a)}>
                    Sil
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <AddressModal
          address={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={async (values) => {
            if (editing === 'new') await create.mutateAsync(values);
            else await update.mutateAsync({ id: editing.id, input: values });
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Adresi sil"
        description={deleting ? `"${deleting.title}" adresi kalıcı olarak silinecek.` : undefined}
        confirmLabel="Sil"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          if (deleting) await remove.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function AddressModal({ address, onClose, onSubmit }: { address: AddressDto | null; onClose: () => void; onSubmit: (values: AddressInput) => Promise<void> }) {
  const form = useForm<FormValues, unknown, AddressInput>({
    resolver: zodResolver(addressInputSchema),
    defaultValues: address
      ? { title: address.title, firstName: address.firstName, lastName: address.lastName, phone: address.phone, city: address.city, district: address.district, postalCode: address.postalCode ?? '', line: address.line, isDefault: address.isDefault }
      : emptyAddress,
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (e) {
      applyServerErrors(e, form.setError);
    }
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={address ? 'Adresi Düzenle' : 'Yeni Adres'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Vazgeç
          </Button>
          <Button type="submit" form="address-form" loading={form.formState.isSubmitting}>
            Kaydet
          </Button>
        </>
      }
    >
      <form id="address-form" onSubmit={submit} noValidate className="space-y-4">
        <AddressFields register={form.register} errors={form.formState.errors} />
        <Checkbox label="Varsayılan teslimat adresi olarak ayarla" {...form.register('isDefault')} />
        {form.formState.errors.root && (
          <p className="error-text" role="alert">
            {form.formState.errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
