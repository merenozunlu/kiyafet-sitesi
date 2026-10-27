import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useAuthStore } from '@/store/auth.store';
import { useGuestCartStore } from '@/store/guest-cart.store';
import { useGuestFavoritesStore } from '@/store/guest-favorites.store';
import { useUiStore } from '@/store/ui.store';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  useAuthStore.getState().clearSession();
  useGuestCartStore.getState().clear();
  useGuestFavoritesStore.getState().clear();
  useUiStore.setState({ toasts: [], cartDrawerOpen: false, mobileMenuOpen: false });
});
