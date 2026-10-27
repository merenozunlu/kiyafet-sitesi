import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError' | 'onLoad'> {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** 'cover' kart için, 'contain' galeri için */
  fit?: 'cover' | 'contain';
  showSpinner?: boolean;
  onLoadStateChange?: (state: 'loading' | 'loaded' | 'error') => void;
}

/** Yüklenme ve hata durumlarını yöneten ürün görseli. */
export function ProductImage({ src, alt, className, imgClassName, fit = 'cover', showSpinner, onLoadStateChange, loading = 'lazy', ...rest }: ProductImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  useEffect(() => {
    setState(src ? 'loading' : 'error');
  }, [src]);

  useEffect(() => {
    onLoadStateChange?.(state);
  }, [state, onLoadStateChange]);

  return (
    <div className={cn('relative overflow-hidden bg-surface-muted', className)}>
      {state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-secondary" role="img" aria-label={alt || 'Görsel yüklenemedi'}>
          <ImageOff className="h-6 w-6" aria-hidden />
          <span className="text-[11px]">Görsel yok</span>
        </div>
      ) : (
        <img
          src={src ?? undefined}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={cn(
            'h-full w-full transition-opacity duration-300',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          )}
          {...rest}
        />
      )}
      {state === 'loading' && (
        <div className={cn('absolute inset-0 animate-pulse bg-surface-muted', showSpinner && 'flex items-center justify-center')} aria-hidden>
          {showSpinner && <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />}
        </div>
      )}
    </div>
  );
}
