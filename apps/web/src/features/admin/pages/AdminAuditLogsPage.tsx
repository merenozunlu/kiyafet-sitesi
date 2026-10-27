import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AuditLogDto } from '@shop/shared';
import { ErrorState } from '@/components/ui/Feedback';
import { Pagination } from '@/components/ui/Pagination';
import { usePageTitle } from '@/hooks/usePageTitle';
import { queryKeys } from '@/lib/query-client';
import { formatDateTime } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { DataTable, PageHeader } from '../components/AdminUi';

const ACTION_LABEL: Record<string, string> = {
  'product.create': 'Ürün oluşturuldu',
  'product.update': 'Ürün güncellendi',
  'product.archive': 'Ürün arşivlendi',
  'category.create': 'Kategori oluşturuldu',
  'category.update': 'Kategori güncellendi',
  'category.delete': 'Kategori silindi',
  'order.status': 'Sipariş durumu değişti',
  'order.payment-status': 'Ödeme durumu değişti',
  'upload.create': 'Görsel yüklendi',
};

export default function AdminAuditLogsPage() {
  usePageTitle('Yönetim · İşlem Kayıtları');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('sayfa') ?? 1));
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.auditLogs(page), queryFn: ({ signal }) => adminService.auditLogs.list(page, signal), placeholderData: (p) => p });

  return (
    <div>
      <PageHeader title="İşlem Kayıtları" description="Yönetici işlemlerinin denetim izi" />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <DataTable<AuditLogDto>
            isLoading={isLoading}
            rows={data?.data ?? []}
            rowKey={(l) => l.id}
            columns={[
              { key: 'date', header: 'Tarih', render: (l) => formatDateTime(l.createdAt) },
              { key: 'actor', header: 'Aktör', render: (l) => l.actorEmail ?? 'sistem' },
              { key: 'action', header: 'İşlem', render: (l) => ACTION_LABEL[l.action] ?? l.action },
              { key: 'entity', header: 'Varlık', hideOnMobile: true, render: (l) => `${l.entityType}${l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}` },
              {
                key: 'meta',
                header: 'Ayrıntı',
                hideOnMobile: true,
                render: (l) => (l.metadata ? <code className="text-[11px] text-secondary">{JSON.stringify(l.metadata)}</code> : '—'),
              },
            ]}
          />
          {data && <Pagination page={page} totalPages={data.meta.totalPages} onChange={(p) => setParams({ sayfa: String(p) })} className="mt-4" />}
        </>
      )}
    </div>
  );
}
