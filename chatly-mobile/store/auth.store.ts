import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserResponse, AuthResponse } from '@/types/auth';

interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  loading: boolean;
  hydrated: boolean;

  setAuth: (payload: AuthResponse) => Promise<void>;
  clearAuth: () => Promise<void>;
  updateUser: (user: UserResponse) => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: false,
  hydrated: false,

  setAuth: async (payload) => {
    await AsyncStorage.setItem('access_token', payload.token);
    await AsyncStorage.setItem('refresh_token', payload.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(payload.user));

    set({
      user: payload.user,
      isAuthenticated: true,
    });
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  updateUser: (user) => set({ user }),

  setLoading: (loading) => set({ loading }),

  hydrate: async () => {
    try {
      const [token, userJson] = await AsyncStorage.multiGet(['access_token', 'user']);
      const hasToken = !!token[1];
      const user = userJson[1] ? JSON.parse(userJson[1]) : null;

      set({
        isAuthenticated: hasToken,
        user,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
}));
