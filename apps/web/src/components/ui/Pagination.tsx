import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}

function range(page: number, total: number): (number | 'dots')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | 'dots')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const prev = sorted[i - 1];
    if (prev !== undefined && cur - prev > 1) out.push('dots');
    out.push(cur);
  }
  return out;
}

export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const items = range(page, totalPages);
  const btn = 'flex h-10 min-w-10 items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Sayfalama" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button type="button" className={cn(btn, 'border-border bg-surface px-2 hover:bg-surface-muted')} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Önceki sayfa">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((it, i) =>
        it === 'dots' ? (
          <span key={`d-${i}`} className="px-1 text-secondary" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            aria-current={it === page ? 'page' : undefined}
            className={cn(btn, 'px-3', it === page ? 'border-primary bg-primary text-surface' : 'border-border bg-surface hover:bg-surface-muted')}
          >
            {it}
          </button>
        ),
      )}
      <button type="button" className={cn(btn, 'border-border bg-surface px-2 hover:bg-surface-muted')} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Sonraki sayfa">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
