import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { z } from 'zod';
import { categoryInputSchema, type CategoryDto, type CategoryInput } from '@shop/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getErrorMessage } from '@/lib/api-client';
import { applyServerErrors } from '@/lib/forms';
import { queryKeys } from '@/lib/query-client';
import { adminService } from '@/services/admin.service';
import { toast } from '@/store/ui.store';
import { DataTable, PageHeader } from '../components/AdminUi';

type FormValues = z.input<typeof categoryInputSchema>;

export default function AdminCategoriesPage() {
  usePageTitle('Yönetim · Kategoriler');
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.categories, queryFn: ({ signal }) => adminService.categories.list(signal) });
  const [editing, setEditing] = useState<CategoryDto | 'new' | null>(null);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.categories });
    void qc.invalidateQueries({ queryKey: queryKeys.categories });
    void qc.invalidateQueries({ queryKey: ['home'] });
  };
  const remove = useMutation({
    mutationFn: (id: string) => adminService.categories.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Kategori silindi');
      setDeleting(null);
    },
    onError: (e) => {
      toast.error('Silinemedi', getErrorMessage(e));
      setDeleting(null);
    },
  });

  return (
    <div>
      <PageHeader title="Kategoriler" description="Mağaza menüsünde sıralama alanına göre gösterilir" actions={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>Yeni Kategori</Button>} />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <DataTable<CategoryDto>
          isLoading={isLoading}
          rows={data ?? []}
          rowKey={(c) => c.id}
          columns={[
            { key: 'order', header: '#', className: 'w-12 text-secondary', render: (c) => c.sortOrder },
            {
              key: 'name',
              header: 'Kategori',
              render: (c) => (
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-secondary">/{c.slug}</p>
                </div>
              ),
            },
            { key: 'count', header: 'Ürün', render: (c) => c.productCount ?? 0 },
            { key: 'active', header: 'Durum', render: (c) => <Badge variant={c.isActive ? 'success' : 'neutral'} size="sm">{c.isActive ? 'Aktif' : 'Pasif'}</Badge> },
            {
              key: 'actions',
              header: '',
              className: 'text-right',
              render: (c) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    Düzenle
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleting(c)} disabled={(c.productCount ?? 0) > 0} title={(c.productCount ?? 0) > 0 ? 'Ürünü olan kategori silinemez' : undefined}>
                    Sil
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      {editing && (
        <CategoryModal
          category={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Kategoriyi sil"
        description={deleting ? `"${deleting.name}" kategorisi silinecek.` : undefined}
        confirmLabel="Sil"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
      />
    </div>
  );
}

function CategoryModal({ category, onClose, onSaved }: { category: CategoryDto | null; onClose: () => void; onSaved: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(categoryInputSchema) as never,
    defaultValues: category
      ? { name: category.name, slug: category.slug, description: category.description ?? '', imageUrl: category.imageUrl ?? '', isActive: category.isActive, sortOrder: category.sortOrder }
      : { name: '', slug: '', description: '', imageUrl: '', isActive: true, sortOrder: 0 },
  });
  const save = useMutation({
    mutationFn: (values: CategoryInput) => (category ? adminService.categories.update(category.id, values) : adminService.categories.create(values)),
    onSuccess: () => {
      toast.success(category ? 'Kategori güncellendi' : 'Kategori oluşturuldu');
      onSaved();
    },
    onError: (e) => applyServerErrors(e, form.setError),
  });
  const { errors } = form.formState;
  return (
    <Modal
      open
      onClose={onClose}
      title={category ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Vazgeç
          </Button>
          <Button type="submit" form="category-form" loading={save.isPending}>
            Kaydet
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={form.handleSubmit((v) => save.mutate(v as CategoryInput))} noValidate className="space-y-4">
        <Input label="Ad" {...form.register('name')} error={errors.name?.message} />
        <Input label="Slug" hint="Boş bırakılırsa addan üretilir" {...form.register('slug')} error={errors.slug?.message} />
        <Textarea label="Açıklama" rows={2} {...form.register('description')} error={errors.description?.message} />
        <Input label="Görsel URL" placeholder="https://…" {...form.register('imageUrl')} error={errors.imageUrl?.message} />
        <Input label="Sıralama" type="number" min={0} {...form.register('sortOrder')} error={errors.sortOrder?.message} />
        <Checkbox label="Aktif (menüde göster)" {...form.register('isActive')} />
        {errors.root && (
          <p className="error-text" role="alert">
            {errors.root.message}
          </p>
        )}
      </form>
    </Modal>
  );
}
