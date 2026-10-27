import type { OrderStatusHistoryDto } from '@shop/shared';
import { ORDER_STATUS_LABELS } from '@shop/shared';
import { cn, formatDateTime } from '@/lib/utils';

export function OrderTimeline({ history, className }: { history: OrderStatusHistoryDto[]; className?: string }) {
  const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <ol className={cn('relative space-y-5 border-l border-border pl-5', className)} aria-label="Sipariş durum geçmişi">
      {sorted.map((h, i) => (
        <li key={h.id} className="relative text-sm">
          <span className={cn('absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-surface', i === 0 ? 'bg-primary' : 'bg-border')} aria-hidden />
          <p className="font-medium">{ORDER_STATUS_LABELS[h.toStatus]}</p>
          <p className="text-xs text-secondary">{formatDateTime(h.createdAt)}</p>
          {h.note && <p className="mt-1 text-secondary">{h.note}</p>}
          {h.trackingNumber && (
            <p className="mt-1 text-xs">
              Takip no: <span className="font-mono">{h.trackingNumber}</span>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
