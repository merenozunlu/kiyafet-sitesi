import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'danger' | 'warning' | 'outline' | 'dark';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-primary',
  accent: 'bg-accent/15 text-accent-hover',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  outline: 'border border-border bg-surface text-primary',
  dark: 'bg-primary text-surface',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'neutral', size = 'md', className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}
