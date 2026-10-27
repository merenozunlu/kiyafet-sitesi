import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { productService } from '@/services/product.service';
import { queryKeys } from '@/lib/query-client';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { Price } from '@/components/ui/Price';
import { ProductImage } from '@/components/product/ProductImage';

export interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
  onNavigate?: () => void;
  size?: 'md' | 'lg';
}

export function SearchBar({ className, autoFocus, onNavigate, size = 'md' }: SearchBarProps) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounced = useDebounce(value.trim(), 300);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const enabled = debounced.length >= 2;
  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: ({ signal }) => productService.search(debounced, signal),
    enabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => setActiveIndex(-1), [debounced]);

  const results = data?.products ?? [];
  const categories = data?.categories ?? [];
  const totalOptions = categories.length + results.length;

  const go = (to: string) => {
    setOpen(false);
    onNavigate?.();
    navigate(to);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q.length < 2) return;
    if (activeIndex >= 0) {
      if (activeIndex < categories.length) return go(`/kategori/${categories[activeIndex]!.slug}`);
      const p = results[activeIndex - categories.length];
      if (p) return go(`/urun/${p.slug}`);
    }
    go(`/arama?q=${encodeURIComponent(q)}`);
  };

  const showPanel = open && value.trim().length >= 2;

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <form role="search" onSubmit={submit}>
        <label htmlFor={`${listId}-input`} className="sr-only">
          Ürün ara
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" aria-hidden />
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            value={value}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="Ürün, kategori veya renk ara"
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!showPanel) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(totalOptions - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(-1, i - 1));
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={`${listId}-list`}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
            className={cn(
              'w-full rounded-full border border-border bg-surface-muted/60 pl-10 pr-10 text-[15px] text-primary placeholder:text-secondary/80 transition-colors',
              'focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/10',
              size === 'lg' ? 'h-12' : 'h-10',
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-secondary hover:bg-border hover:text-primary"
              aria-label="Aramayı temizle"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {showPanel && (
        <div
          id={`${listId}-list`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-overlay animate-fade-in"
        >
          {!enabled ? null : isFetching && !data ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Aranıyor…
            </div>
          ) : isError ? (
            <p className="px-3 py-4 text-sm text-danger">Arama yapılamadı. Lütfen tekrar deneyin.</p>
          ) : totalOptions === 0 ? (
            <p className="px-3 py-4 text-sm text-secondary">
              “{debounced}” için sonuç bulunamadı.
            </p>
          ) : (
            <>
              {categories.length > 0 && (
                <div className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-secondary">Kategoriler</p>
                  {categories.map((c, i) => (
                    <Link
                      key={c.id}
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={activeIndex === i}
                      to={`/kategori/${c.slug}`}
                      onClick={() => go(`/kategori/${c.slug}`)}
                      className={cn('block rounded-md px-3 py-2 text-sm hover:bg-surface-muted', activeIndex === i && 'bg-surface-muted')}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
              <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-secondary">Ürünler</p>
              {results.map((p, idx) => {
                const i = idx + categories.length;
                return (
                  <Link
                    key={p.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={activeIndex === i}
                    to={`/urun/${p.slug}`}
                    onClick={() => go(`/urun/${p.slug}`)}
                    className={cn('flex items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-muted', activeIndex === i && 'bg-surface-muted')}
                  >
                    <ProductImage src={p.image?.imageUrl} alt="" className="h-12 w-10 shrink-0 rounded" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-secondary">{p.category.name}</span>
                    </span>
                    <Price cents={p.priceCents} compareAtCents={p.compareAtPriceCents} size="sm" />
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => go(`/arama?q=${encodeURIComponent(debounced)}`)}
                className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-surface-muted"
              >
                “{debounced}” için tüm sonuçları gör
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
