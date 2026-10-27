import type { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { getErrorMessage } from '@/lib/api-client';

// ---------- Skeleton ----------

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-muted', className)} {...rest} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-product w-full rounded-lg" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ---------- Spinner ----------

export function Spinner({ className, label = 'Yükleniyor' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-secondary', className)}>
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageSpinner({ label = 'Yükleniyor' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-secondary" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ---------- Empty / Error ----------

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-secondary">
        {icon ?? <PackageOpen className="h-6 w-6" aria-hidden />}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-secondary">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  error?: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ error, title = 'Bir sorun oluştu', description, onRetry, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger/5 px-6 py-12 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-secondary">{description ?? getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Tekrar dene
        </Button>
      )}
    </div>
  );
}
