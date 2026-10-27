import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

export function QuantitySelector({ value, onChange, min = 1, max = 20, disabled, size = 'md', className, label = 'Adet' }: QuantitySelectorProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const h = size === 'md' ? 'h-11' : 'h-9';
  const w = size === 'md' ? 'w-11' : 'w-9';
  return (
    <div className={cn('inline-flex items-center rounded-md border border-border bg-surface', h, disabled && 'opacity-60', className)} role="group" aria-label={label}>
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= min}
        className={cn('flex h-full items-center justify-center rounded-l-md text-primary hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-secondary/60', w)}
        aria-label="Azalt"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.min(max, Math.max(min, Math.trunc(n))));
        }}
        className="h-full w-10 border-x border-border bg-transparent text-center text-sm font-medium tabular-nums focus:outline-none"
        aria-label={label}
      />
      <button
        type="button"
        onClick={inc}
        disabled={disabled || value >= max}
        className={cn('flex h-full items-center justify-center rounded-r-md text-primary hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-secondary/60', w)}
        aria-label="Artır"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
