import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  id: string;
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
  /** Label'ı görsel olarak gizle (ekran okuyucular için kalır) */
  hideLabel?: boolean;
}

/** Label, hata ve açıklama metnini standartlaştıran sarmalayıcı. */
export function FormField({ id, label, required, error, hint, className, children, hideLabel }: FormFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={id} className={cn('label', hideLabel && 'sr-only')}>
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="error-text">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="help-text">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}
