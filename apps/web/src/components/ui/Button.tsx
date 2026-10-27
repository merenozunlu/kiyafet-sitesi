import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary/90 disabled:bg-primary/60',
  secondary: 'bg-surface-muted text-primary hover:bg-border disabled:text-secondary',
  outline: 'border border-border bg-surface text-primary hover:bg-surface-muted disabled:text-secondary',
  ghost: 'bg-transparent text-primary hover:bg-surface-muted disabled:text-secondary',
  danger: 'bg-danger text-surface hover:bg-danger/90 disabled:bg-danger/60',
  accent: 'bg-accent text-surface hover:bg-accent-hover disabled:bg-accent/60',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto disabled:text-secondary',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, disabled, children, type = 'button', ...rest },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
