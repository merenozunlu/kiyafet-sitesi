import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Arka plana tıklayınca kapanmasın */
  disableBackdropClose?: boolean;
  hideCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[min(96vw,1400px)]',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableBackdropClose,
  hideCloseButton,
  className,
  contentClassName,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div
        className="absolute inset-0 bg-primary/40 animate-fade-in"
        onClick={disableBackdropClose ? undefined : onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-surface shadow-overlay animate-slide-up sm:rounded-xl',
          sizes[size],
          className,
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-secondary">
                  {description}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-secondary hover:bg-surface-muted hover:text-primary"
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto px-5 py-5 sm:px-6', contentClassName)}>{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border bg-surface px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
