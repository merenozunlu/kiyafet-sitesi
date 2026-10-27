import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Misafir sepeti: yalnızca variantId + quantity tutulur.
 * Fiyat, stok ve toplamlar her zaman sunucudan (POST /cart/validate) hesaplanır.
 */
export interface GuestCartLine {
  variantId: string;
  quantity: number;
}

interface GuestCartState {
  lines: GuestCartLine[];
  add: (variantId: string, quantity: number, max?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  replace: (lines: GuestCartLine[]) => void;
}

export const useGuestCartStore = create<GuestCartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (variantId, quantity, max = 20) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === variantId);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.variantId === variantId ? { ...l, quantity: Math.min(max, l.quantity + quantity) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { variantId, quantity: Math.min(max, quantity) }] };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => {
          if (quantity <= 0) return { lines: s.lines.filter((l) => l.variantId !== variantId) };
          if (s.lines.some((l) => l.variantId === variantId)) {
            return { lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)) };
          }
          return { lines: [...s.lines, { variantId, quantity }] };
        }),
      remove: (variantId) => set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      replace: (lines) => set({ lines }),
    }),
    { name: 'shop.guest-cart.v1' },
  ),
);

export function guestCartSignature(lines: GuestCartLine[]) {
  return lines.map((l) => `${l.variantId}:${l.quantity}`).join('|');
}
