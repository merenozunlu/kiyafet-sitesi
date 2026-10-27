import { useEffect } from 'react';

let lockCount = 0;

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    lockCount += 1;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = prevOverflow;
        document.body.style.paddingRight = prevPadding;
      }
    };
  }, [locked]);
}
