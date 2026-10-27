import { useEffect } from 'react';

export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title.includes('Atölye') ? title : `${title} — Atölye`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
