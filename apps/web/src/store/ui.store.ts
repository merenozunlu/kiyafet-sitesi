import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
  action?: { label: string; onClick: () => void };
}

interface UiState {
  toasts: ToastItem[];
  cartDrawerOpen: boolean;
  mobileMenuOpen: boolean;
  pushToast: (t: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismissToast: (id: string) => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

let counter = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  cartDrawerOpen: false,
  mobileMenuOpen: false,
  pushToast: (t) => {
    const id = `toast-${++counter}`;
    const item: ToastItem = { durationMs: 3500, ...t, id };
    set((s) => ({ toasts: [...s.toasts.slice(-3), item] }));
    return id;
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
}));

/** Component dışından kullanım için kısayol. */
export const toast = {
  success: (title: string, description?: string) => useUiStore.getState().pushToast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, variant: 'error', durationMs: 5000 }),
  info: (title: string, description?: string) => useUiStore.getState().pushToast({ title, description, variant: 'info' }),
  warning: (title: string, description?: string) =>
    useUiStore.getState().pushToast({ title, description, variant: 'warning', durationMs: 5000 }),
};
