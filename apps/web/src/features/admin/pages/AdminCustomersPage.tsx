import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { formatCents, type AdminCustomerDto } from '@shop/shared';
import { ErrorState } from '@/components/ui/Feedback';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import { queryKeys } from '@/lib/query-client';
import { formatDate } from '@/lib/utils';
import { adminService } from '@/services/admin.service';
import { DataTable, PageHeader } from '../components/AdminUi';

export default function AdminCustomersPage() {
  usePageTitle('Yönetim · Müşteriler');
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('sayfa') ?? 1));
  const [q, setQ] = useState(params.get('q') ?? '');
  const dq = useDebounce(q, 300);
  const query = { q: dq || undefined, page, pageSize: 20 };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: queryKeys.admin.customers(query), queryFn: ({ signal }) => adminService.customers.list(query, signal), placeholderData: (p) => p });

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'sayfa') next.delete('sayfa');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Müşteriler" description={data ? `${data.meta.total} kayıt` : undefined} />
      <Input
        label="Ara"
        hideLabel
        placeholder="Ad veya e-posta"
        leftIcon={<Search className="h-4 w-4" />}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setParam('q', e.target.value);
        }}
        containerClassName="mb-4 w-full sm:w-72"
      />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <DataTable<AdminCustomerDto>
            isLoading={isLoading}
            rows={data?.data ?? []}
            rowKey={(c) => c.id}
            columns={[
              {
                key: 'name',
                header: 'Müşteri',
                render: (c) => (
                  <div>
                    <p className="font-medium">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-secondary">{c.email}</p>
                  </div>
                ),
              },
              { key: 'phone', header: 'Telefon', hideOnMobile: true, render: (c) => c.phone ?? '—' },
              { key: 'joined', header: 'Kayıt', hideOnMobile: true, render: (c) => formatDate(c.createdAt) },
              { key: 'orders', header: 'Sipariş', render: (c) => c.orderCount },
              { key: 'spent', header: 'Harcama', className: 'text-right', render: (c) => <span className="tabular-nums">{formatCents(c.totalSpentCents)}</span> },
              { key: 'last', header: 'Son sipariş', hideOnMobile: true, render: (c) => (c.lastOrderAt ? formatDate(c.lastOrderAt) : '—') },
            ]}
          />
          {data && <Pagination page={page} totalPages={data.meta.totalPages} onChange={(p) => setParam('sayfa', String(p))} className="mt-4" />}
        </>
      )}
    </div>
  );
}
