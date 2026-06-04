import { create } from 'zustand';
import type { User } from '@gastapp/types';

interface AuthState {
  accessToken: string | null;
  user: Pick<User, 'id' | 'email' | 'name'> | null;
  setAuth: (token: string, user: AuthState['user']) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clear: () => set({ accessToken: null, user: null }),
}));
