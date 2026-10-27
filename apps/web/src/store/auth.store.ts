import { create } from 'zustand';
import type { AuthResponseDto, UserDto } from '@shop/shared';
import { configureApiAuth, tryRefreshSession } from '@/lib/api-client';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  user: UserDto | null;
  /** Access token yalnızca bellekte tutulur; sayfa yenilemede refresh ile geri alınır. */
  accessToken: string | null;
  status: AuthStatus;
  setSession: (data: AuthResponseDto) => void;
  setUser: (user: UserDto) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',
  setSession: (data) => set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ user: null, accessToken: null, status: 'anonymous' }),
  bootstrap: async () => {
    if (get().status !== 'idle') return;
    set({ status: 'loading' });
    const ok = await tryRefreshSession();
    if (!ok) set({ status: 'anonymous' });
  },
}));

configureApiAuth({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onRefreshed: (data) => useAuthStore.getState().setSession(data),
  onSessionExpired: () => useAuthStore.getState().clearSession(),
});

export const selectIsAuthenticated = (s: AuthState) => s.status === 'authenticated' && !!s.user;
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'ADMIN';
