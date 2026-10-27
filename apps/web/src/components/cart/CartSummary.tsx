import type { CartSummaryDto } from '@shop/shared';
import { formatCents } from '@shop/shared';
import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CartSummary({ summary, className, showShippingHint = true }: { summary: CartSummaryDto; className?: string; showShippingHint?: boolean }) {
  const remaining = summary.freeShippingThresholdCents - summary.subtotalCents;
  const row = 'flex items-center justify-between text-sm';
  return (
    <div className={cn('space-y-2.5', className)}>
      <div className={row}>
        <span className="text-secondary">Ara toplam</span>
        <span className="tabular-nums">{formatCents(summary.subtotalCents)}</span>
      </div>
      <div className={row}>
        <span className="text-secondary">İndirim</span>
        <span className="tabular-nums">{summary.discountCents > 0 ? `−${formatCents(summary.discountCents)}` : '—'}</span>
      </div>
      <div className={row}>
        <span className="text-secondary">Kargo</span>
        <span className="tabular-nums">{summary.subtotalCents === 0 ? '—' : summary.shippingCents === 0 ? <span className="text-success">Ücretsiz</span> : formatCents(summary.shippingCents)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3 text-base font-semibold">
        <span>Genel toplam</span>
        <span className="tabular-nums">{formatCents(summary.totalCents)}</span>
      </div>
      {showShippingHint && summary.subtotalCents > 0 && remaining > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-secondary">
          <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium text-primary">{formatCents(remaining)}</span> daha ekleyin, kargo ücretsiz olsun.
          </span>
        </p>
      )}
    </div>
  );
}
