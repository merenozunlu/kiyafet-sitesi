import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore, type ToastItem } from '@/store/ui.store';

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-danger" aria-hidden />,
  warning: <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />,
  info: <Info className="h-5 w-5 text-primary" aria-hidden />,
};

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useUiStore((s) => s.dismissToast);
  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(t);
  }, [item.id, item.durationMs, dismiss]);

  return (
    <div
      role={item.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-overlay animate-slide-up',
      )}
    >
      <span className="mt-0.5 shrink-0">{icons[item.variant]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary">{item.title}</p>
        {item.description && <p className="mt-0.5 text-sm text-secondary">{item.description}</p>}
        {item.action && (
          <button
            type="button"
            onClick={() => {
              item.action?.onClick();
              dismiss(item.id);
            }}
            className="mt-2 text-sm font-medium text-primary underline underline-offset-4"
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-secondary hover:bg-surface-muted hover:text-primary"
        aria-label="Bildirimi kapat"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}
