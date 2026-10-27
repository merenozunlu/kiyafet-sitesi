import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { describedBy, FormField } from './FormField';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id: idProp, label, error, hint, className, containerClassName, required, rows = 4, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        required={required}
        className={cn(
          'w-full resize-y rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-primary placeholder:text-secondary/80 transition-colors',
          'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-secondary',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        {...rest}
      />
    </FormField>
  );
});
