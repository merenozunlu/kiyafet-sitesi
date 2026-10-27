import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/Feedback';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyText = 'Kayıt bulunamadı',
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-left text-xs uppercase tracking-wide text-secondary">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.hideOnMobile && 'hidden md:table-cell')}>
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-secondary">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={rowKey(r)}
                className={cn(onRowClick && 'cursor-pointer hover:bg-surface-muted')}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => (e.key === 'Enter' ? onRowClick(r) : undefined) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3 align-middle', c.hideOnMobile && 'hidden md:table-cell', c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
        {icon && <span className="text-secondary">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-secondary">{hint}</p>}
    </div>
  );
}
