import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GuestFavoritesState {
  productIds: string[];
  toggle: (productId: string) => boolean;
  clear: () => void;
}

export const useGuestFavoritesStore = create<GuestFavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) => {
        const has = get().productIds.includes(productId);
        set((s) => ({
          productIds: has ? s.productIds.filter((id) => id !== productId) : [...s.productIds, productId],
        }));
        return !has;
      },
      clear: () => set({ productIds: [] }),
    }),
    { name: 'shop.guest-favorites.v1' },
  ),
);
