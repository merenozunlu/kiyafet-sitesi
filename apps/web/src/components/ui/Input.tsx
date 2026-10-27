import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { describedBy, FormField } from './FormField';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  hideLabel?: boolean;
  containerClassName?: string;
}

export const inputBaseClass =
  'h-11 w-full rounded-md border bg-surface px-3.5 text-[15px] text-primary placeholder:text-secondary/80 transition-colors ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-secondary ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/10 border-border';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id: idProp, label, error, hint, leftIcon, rightElement, className, containerClassName, required, hideLabel, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required} className={containerClassName} hideLabel={hideLabel}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-secondary" aria-hidden>
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          required={required}
          className={cn(inputBaseClass, leftIcon && 'pl-10', rightElement && 'pr-11', className)}
          {...rest}
        />
        {rightElement && <span className="absolute inset-y-0 right-2 flex items-center">{rightElement}</span>}
      </div>
    </FormField>
  );
});

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightElement'>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        autoComplete={props.autoComplete ?? 'current-password'}
        rightElement={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded text-secondary hover:text-primary"
            aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
            aria-pressed={visible}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        {...props}
      />
    );
  },
);
