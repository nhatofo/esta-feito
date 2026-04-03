import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User, AuthTokens } from '@esta-feito/shared';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync('auth_user',   JSON.stringify(user));
    await SecureStore.setItemAsync('auth_tokens', JSON.stringify(tokens));
    set({ user, tokens, isAuthenticated: true });
  },

  updateUser: (updates) =>
    set((state) => ({ user: state.user ? { ...state.user, ...updates } : null })),

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('auth_user');
    await SecureStore.deleteItemAsync('auth_tokens');
    set({ user: null, tokens: null, isAuthenticated: false });
  },

  hydrate: async () => {
    try {
      const [userStr, tokensStr] = await Promise.all([
        SecureStore.getItemAsync('auth_user'),
        SecureStore.getItemAsync('auth_tokens'),
      ]);
      if (userStr && tokensStr) {
        set({
          user: JSON.parse(userStr),
          tokens: JSON.parse(tokensStr),
          isAuthenticated: true,
        });
      }
    } catch { /* ignore */ }
    finally { set({ hydrated: true }); }
  },
}));
