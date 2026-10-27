import type { ProductVariantDto, Size } from '@shop/shared';
import { SIZES } from '@shop/shared';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColorOption {
  name: string;
  hex: string | null;
  available: boolean;
}

export function ColorSelector({ colors, value, onChange }: { colors: ColorOption[]; value: string | null; onChange: (c: string) => void }) {
  if (colors.length === 0) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">
        Renk{value && <span className="ml-1 font-normal text-secondary">— {value}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => {
          const selected = c.name === value;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onChange(c.name)}
              aria-pressed={selected}
              aria-label={`${c.name}${c.available ? '' : ' (stokta yok)'}`}
              title={c.name}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
                selected ? 'border-primary' : 'border-transparent hover:border-border',
                !c.available && 'opacity-50',
              )}
            >
              <span className="h-7 w-7 rounded-full border border-border" style={{ backgroundColor: c.hex ?? '#E5E7EB' }} aria-hidden />
              {selected && <Check className="absolute h-3.5 w-3.5 text-surface mix-blend-difference" aria-hidden />}
              {!c.available && <span className="absolute h-px w-9 rotate-45 bg-secondary" aria-hidden />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export interface SizeOption {
  size: Size;
  variant: ProductVariantDto | null;
}

export function SizeSelector({
  options,
  value,
  onChange,
  error,
}: {
  options: SizeOption[];
  value: Size | null;
  onChange: (s: Size) => void;
  error?: string | null;
}) {
  return (
    <fieldset aria-describedby={error ? 'size-error' : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
        <span>
          Beden{value && <span className="ml-1 font-normal text-secondary">— {value}</span>}
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Beden seçimi">
        {SIZES.map((size) => {
          const opt = options.find((o) => o.size === size);
          const variant = opt?.variant ?? null;
          const available = !!variant && variant.isActive && variant.stockQuantity > 0;
          const selected = value === size;
          const lowStock = available && variant.stockQuantity <= 3;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!available}
              onClick={() => onChange(size)}
              data-testid={`size-${size}`}
              aria-label={`${size}${!available ? ' (stokta yok)' : lowStock ? ` (son ${variant.stockQuantity} adet)` : ''}`}
              className={cn(
                'relative flex h-11 items-center justify-center rounded-md border text-sm font-medium transition-colors',
                selected ? 'border-primary bg-primary text-surface' : 'border-border bg-surface hover:border-primary',
                !available && 'cursor-not-allowed border-dashed text-secondary/60 hover:border-border',
                error && !selected && available && 'border-danger/60',
              )}
            >
              {size}
              {!available && <span className="pointer-events-none absolute inset-x-2 top-1/2 h-px -rotate-12 bg-secondary/50" aria-hidden />}
              {lowStock && !selected && <span className="absolute -top-1.5 right-1 rounded bg-warning px-1 text-[9px] font-semibold text-surface">son {variant.stockQuantity}</span>}
            </button>
          );
        })}
      </div>
      {error && (
        <p id="size-error" role="alert" className="error-text">
          {error}
        </p>
      )}
    </fieldset>
  );
}
