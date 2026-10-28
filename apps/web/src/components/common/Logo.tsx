import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-baseline gap-1 font-display text-2xl font-semibold tracking-tight text-primary', className)} aria-label="Muka ana sayfa">
      Muka
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
    </Link>
  );
}
