import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describedBy, FormField } from './FormField';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
  hideLabel?: boolean;
  size?: 'sm' | 'md';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { id: idProp, label, error, hint, options, placeholder, className, containerClassName, required, hideLabel, size = 'md', ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required} className={containerClassName} hideLabel={hideLabel}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          required={required}
          className={cn(
            'w-full appearance-none rounded-md border border-border bg-surface pl-3.5 pr-10 text-primary transition-colors',
            size === 'md' ? 'h-11 text-[15px]' : 'h-9 text-sm',
            'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
            'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-secondary',
            'aria-[invalid=true]:border-danger',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled={required}>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
      </div>
    </FormField>
  );
});
