import { useEffect, useState } from 'react';
import type { ProductFacetsDto } from '@shop/shared';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { FilterState } from '../useProductFilters';

export interface ProductFiltersProps {
  state: FilterState;
  facets: ProductFacetsDto | undefined;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  activeCount: number;
  className?: string;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0 last:border-b-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ProductFilters({ state, facets, onChange, onReset, activeCount, className }: ProductFiltersProps) {
  const [minInput, setMinInput] = useState(state.minPrice?.toString() ?? '');
  const [maxInput, setMaxInput] = useState(state.maxPrice?.toString() ?? '');

  useEffect(() => {
    setMinInput(state.minPrice?.toString() ?? '');
    setMaxInput(state.maxPrice?.toString() ?? '');
  }, [state.minPrice, state.maxPrice]);

  const applyPrice = () => {
    const min = minInput === '' ? undefined : Math.max(0, Number(minInput));
    const max = maxInput === '' ? undefined : Math.max(0, Number(maxInput));
    if (min != null && max != null && min > max) {
      onChange({ minPrice: max, maxPrice: min });
      return;
    }
    onChange({ minPrice: Number.isFinite(min) ? min : undefined, maxPrice: Number.isFinite(max) ? max : undefined });
  };

  const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className={cn('text-sm', className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Filtreler</h2>
        {activeCount > 0 && (
          <Button variant="link" size="sm" onClick={onReset} className="text-secondary">
            Temizle ({activeCount})
          </Button>
        )}
      </div>

      <Group title="Durum">
        <div className="space-y-2.5">
          <Checkbox label="Stokta olanlar" checked={state.inStock} onChange={(e) => onChange({ inStock: e.target.checked })} />
          <Checkbox label="İndirimli ürünler" checked={state.onSale} onChange={(e) => onChange({ onSale: e.target.checked })} />
          <Checkbox label="Yeni gelenler" checked={state.isNew} onChange={(e) => onChange({ isNew: e.target.checked })} />
        </div>
      </Group>

      <Group title="Fiyat (TL)">
        <div className="flex items-center gap-2">
          <Input type="number" inputMode="numeric" min={0} placeholder={facets ? String(Math.floor(facets.priceRange.minCents / 100)) : 'Min'} value={minInput} onChange={(e) => setMinInput(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} label="En düşük fiyat" hideLabel className="h-10" />
          <span className="text-secondary">–</span>
          <Input type="number" inputMode="numeric" min={0} placeholder={facets ? String(Math.ceil(facets.priceRange.maxCents / 100)) : 'Maks'} value={maxInput} onChange={(e) => setMaxInput(e.target.value)} onBlur={applyPrice} onKeyDown={(e) => e.key === 'Enter' && applyPrice()} label="En yüksek fiyat" hideLabel className="h-10" />
        </div>
      </Group>

      <Group title="Beden">
        <div className="grid grid-cols-5 gap-2">
          {(facets?.sizes ?? ['S', 'M', 'L', 'XL', 'XXL']).map((s) => {
            const checked = state.size.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={checked}
                onClick={() => onChange({ size: toggleIn(state.size, s) })}
                className={cn('h-10 rounded-md border text-sm font-medium transition-colors', checked ? 'border-primary bg-primary text-surface' : 'border-border bg-surface hover:border-primary')}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Group>

      {facets && facets.colors.length > 0 && (
        <Group title="Renk">
          <div className="space-y-2">
            {facets.colors.map((c) => (
              <Checkbox
                key={c.name}
                checked={state.color.includes(c.name)}
                onChange={() => onChange({ color: toggleIn(state.color, c.name) })}
                label={
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: c.hex ?? '#E5E7EB' }} aria-hidden />
                    {c.name}
                  </span>
                }
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}
