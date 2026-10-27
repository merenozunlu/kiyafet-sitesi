import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: string;
  containerClassName?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id: idProp, label, error, className, containerClassName, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={cn('inline-flex cursor-pointer items-start gap-2.5 text-sm', disabled && 'cursor-not-allowed opacity-60')}>
        <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'peer h-[18px] w-[18px] cursor-pointer appearance-none rounded border border-border bg-surface transition-colors',
              'checked:border-primary checked:bg-primary',
              'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed',
              'aria-[invalid=true]:border-danger',
              className,
            )}
            {...rest}
          />
          <Check className="pointer-events-none absolute h-3 w-3 text-surface opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
        </span>
        {label && <span className="text-primary">{label}</span>}
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="error-text">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
