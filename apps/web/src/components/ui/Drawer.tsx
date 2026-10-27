import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  side?: 'left' | 'right';
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  widthClassName?: string;
}

export function Drawer({ open, onClose, title, side = 'right', children, footer, className, widthClassName = 'max-w-md' }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="presentation">
      <div className="absolute inset-0 bg-primary/40 animate-fade-in" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 flex w-full flex-col bg-surface shadow-overlay',
          widthClassName,
          side === 'right' ? 'right-0 animate-slide-in-right' : 'left-0 animate-slide-in-left',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-md text-secondary hover:bg-surface-muted hover:text-primary"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
