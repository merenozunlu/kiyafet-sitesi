import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { formatCents, ORDER_STATUS_LABELS, ORDER_STATUSES, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUSES, type OrderDto } from '@shop/shared';
import { ErrorState } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/ui/OrderStatusBadge';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import { queryKeys } from '@/lib/query-client';
import { formatDateTime } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { DataTable, PageHeader } from '../components/AdminUi';

export default function AdminOrdersPage() {
  usePageTitle('Yönetim · Siparişler');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('sayfa') ?? 1));
  const status = params.get('durum') ?? '';
  const paymentStatus = params.get('odeme') ?? '';
  const [q, setQ] = useState(params.get('q') ?? '');
  const dq = useDebounce(q, 300);

  const query = { q: dq || undefined, status: status || undefined, paymentStatus: paymentStatus || undefined, page, pageSize: 20 };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.orders(query), queryFn: ({ signal }) => adminService.orders.list(query, signal), placeholderData: (p) => p, refetchInterval: 30_000 });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'sayfa') next.delete('sayfa');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Siparişler" description={data ? `${data.meta.total} sipariş` : undefined} />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          label="Ara"
          hideLabel
          placeholder="Sipariş no veya e-posta"
          leftIcon={<Search className="h-4 w-4" />}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setParam('q', e.target.value);
          }}
          containerClassName="w-full sm:w-72"
        />
        <Select label="Durum" hideLabel value={status} onChange={(e) => setParam('durum', e.target.value)} options={[{ value: '', label: 'Tüm durumlar' }, ...ORDER_STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABELS[s] }))]} containerClassName="w-44" />
        <Select label="Ödeme" hideLabel value={paymentStatus} onChange={(e) => setParam('odeme', e.target.value)} options={[{ value: '', label: 'Tüm ödemeler' }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] }))]} containerClassName="w-44" />
      </div>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <DataTable<OrderDto>
            isLoading={isLoading}
            rows={data?.data ?? []}
            rowKey={(o) => o.id}
            onRowClick={(o) => navigate(`/admin/siparisler/${o.id}`)}
            columns={[
              { key: 'no', header: 'Sipariş', render: (o) => <span className="font-mono">{o.orderNumber}</span> },
              {
                key: 'customer',
                header: 'Müşteri',
                render: (o) => (
                  <div className="min-w-0">
                    <p className="truncate">{o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : '—'}</p>
                    <p className="truncate text-xs text-secondary">{o.customerEmail}</p>
                  </div>
                ),
              },
              { key: 'date', header: 'Tarih', hideOnMobile: true, render: (o) => formatDateTime(o.createdAt) },
              { key: 'method', header: 'Yöntem', hideOnMobile: true, render: (o) => PAYMENT_METHOD_LABELS[o.paymentMethod] },
              { key: 'status', header: 'Durum', render: (o) => <OrderStatusBadge status={o.status} size="sm" /> },
              { key: 'pay', header: 'Ödeme', hideOnMobile: true, render: (o) => <PaymentStatusBadge status={o.paymentStatus} size="sm" /> },
              { key: 'total', header: 'Tutar', className: 'text-right', render: (o) => <span className="tabular-nums font-medium">{formatCents(o.totalCents)}</span> },
            ]}
          />
          {data && <Pagination page={page} totalPages={data.meta.totalPages} onChange={(p) => setParam('sayfa', String(p))} className="mt-4" />}
        </>
      )}
    </div>
  );
}
