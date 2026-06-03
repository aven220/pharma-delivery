import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { UserDTO, AuthTokens } from '@pharma/types';
import { clearLocalDeliveries } from '../database/deliveries.repo';

const ACCESS_TOKEN_KEY = 'pharma_access_token';
const REFRESH_TOKEN_KEY = 'pharma_refresh_token';
const USER_KEY = 'pharma_user';

interface AuthState {
  user: UserDTO | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (user: UserDTO, tokens: AuthTokens) => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  setAuth: async (user, tokens) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  setTokens: async (tokens) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  loadStoredAuth: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const user = userJson ? JSON.parse(userJson) : null;
      set({ accessToken, refreshToken, user, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await clearLocalDeliveries();
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
