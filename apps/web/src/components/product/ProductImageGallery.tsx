import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import type { ProductImageDto } from '@shop/shared';
import { cn } from '@/lib/utils';
import { ProductImage } from './ProductImage';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ProductImageGalleryProps {
  images: ProductImageDto[];
  productName: string;
}

function large(url: string) {
  return url.includes('unsplash.com') ? url.replace(/w=\d+/, 'w=1600') : url;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const count = images.length;

  useEffect(() => setIndex(0), [images]);

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  if (count === 0) {
    return <ProductImage src={null} alt={productName} className="aspect-product w-full rounded-lg" />;
  }
  const current = images[index]!;

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Görseli büyüt"
        >
          <ProductImage src={current.imageUrl} alt={current.altText || productName} className="aspect-product w-full" loading="eager" showSpinner />
          <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-primary shadow-soft opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <ZoomIn className="h-4 w-4" aria-hidden />
          </span>
        </button>
        {count > 1 && (
          <>
            <button type="button" onClick={prev} className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-soft hover:bg-surface" aria-label="Önceki görsel">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={next} className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-soft hover:bg-surface" aria-label="Sonraki görsel">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin lg:w-20 lg:flex-col lg:overflow-y-auto" role="tablist" aria-label="Ürün görselleri">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Görsel ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn('relative w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors lg:w-full', i === index ? 'border-primary' : 'border-transparent hover:border-border')}
            >
              <ProductImage src={img.imageUrl} alt="" className="aspect-product w-full" />
            </button>
          ))}
        </div>
      )}

      <Lightbox open={lightbox} onClose={() => setLightbox(false)} images={images} index={index} onIndexChange={setIndex} productName={productName} />
    </div>
  );
}

interface LightboxProps {
  open: boolean;
  onClose: () => void;
  images: ProductImageDto[];
  index: number;
  onIndexChange: (i: number) => void;
  productName: string;
}

export function Lightbox({ open, onClose, images, index, onIndexChange, productName }: LightboxProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  useLockBodyScroll(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
      else if (e.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, index, count, onIndexChange]);

  if (!open || count === 0) return null;
  const current = images[index]!;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/95 animate-fade-in" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${productName} görseli ${index + 1} / ${count}`}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-6xl flex-col items-center justify-center p-4 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20" aria-label="Kapat">
          <X className="h-6 w-6" />
        </button>
        <div className="flex max-h-[80vh] w-full items-center justify-center" onClick={onClose}>
          <ProductImage
            key={current.id}
            src={large(current.imageUrl)}
            alt={current.altText || productName}
            fit="contain"
            className="h-[80vh] w-full bg-transparent"
            imgClassName="cursor-zoom-out"
            loading="eager"
            showSpinner
          />
        </div>
        {count > 1 && (
          <>
            <button type="button" onClick={() => onIndexChange((index - 1 + count) % count)} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20 sm:left-6" aria-label="Önceki görsel">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button type="button" onClick={() => onIndexChange((index + 1) % count)} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/10 text-surface hover:bg-surface/20 sm:right-6" aria-label="Sonraki görsel">
              <ChevronRight className="h-6 w-6" />
            </button>
            <p className="mt-4 text-sm text-surface/80" aria-live="polite">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
