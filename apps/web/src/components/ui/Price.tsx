import { formatCents } from '@shop/shared';
import { cn } from '@/lib/utils';

export interface PriceProps {
  cents: number;
  compareAtCents?: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** İndirimli fiyatta vurgu rengi kullan */
  emphasizeDiscount?: boolean;
}

const sizes = { sm: 'text-sm', md: 'text-[15px]', lg: 'text-lg', xl: 'text-2xl' };
const compareSizes = { sm: 'text-xs', md: 'text-sm', lg: 'text-sm', xl: 'text-base' };

export function Price({ cents, compareAtCents, size = 'md', className, emphasizeDiscount = true }: PriceProps) {
  const hasDiscount = compareAtCents != null && compareAtCents > cents;
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className={cn('font-semibold tabular-nums', sizes[size], hasDiscount && emphasizeDiscount ? 'text-danger' : 'text-primary')}>
        {formatCents(cents)}
      </span>
      {hasDiscount && (
        <span className={cn('tabular-nums text-secondary line-through', compareSizes[size])}>
          <span className="sr-only">Önceki fiyat: </span>
          {formatCents(compareAtCents)}
        </span>
      )}
    </span>
  );
}
