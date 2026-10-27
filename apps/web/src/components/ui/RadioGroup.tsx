import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RadioOption<T extends string> {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
}

export interface RadioGroupProps<T extends string> {
  name: string;
  label?: string;
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  error?: string;
  orientation?: 'vertical' | 'horizontal';
  variant?: 'plain' | 'card';
  className?: string;
}

export function RadioGroup<T extends string>({
  name,
  label,
  value,
  onChange,
  options,
  error,
  orientation = 'vertical',
  variant = 'card',
  className,
}: RadioGroupProps<T>) {
  const id = useId();
  return (
    <fieldset className={className} aria-describedby={error ? `${id}-error` : undefined} aria-invalid={error ? true : undefined}>
      {label && <legend className="label">{label}</legend>}
      <div className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map((o) => {
          const checked = value === o.value;
          const optionId = `${id}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={optionId}
              className={cn(
                'flex cursor-pointer items-start gap-3 transition-colors',
                variant === 'card' && 'rounded-md border bg-surface p-4',
                variant === 'card' && (checked ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-secondary/60'),
                o.disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={o.value}
                  checked={checked}
                  disabled={o.disabled}
                  onChange={() => onChange(o.value)}
                  className={cn(
                    'peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-full border border-border bg-surface transition-colors',
                    'checked:border-primary checked:border-[5px]',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed',
                  )}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  {o.icon}
                  {o.label}
                </span>
                {o.description && <span className="mt-0.5 text-sm text-secondary">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="error-text">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
