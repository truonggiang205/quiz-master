import { create } from 'zustand';
import { apiClient } from '../services/api';
import { User, UserRole } from '../types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User) => void;
  logout: () => void;
  setAuthSession: (user: User, token: string) => void;
  checkAuth: () => Promise<void>;
}

const STORAGE_USER_KEY = 'quizmaster_auth_user';
const STORAGE_TOKEN_KEY = 'quizmaster_auth_token';

const getInitialAuth = (): { user: User | null; token: string | null } => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!raw || !token) {
      return { user: null, token: null };
    }
    const user = JSON.parse(raw);
    if (!user || !user.id || !user.role) {
      return { user: null, token: null };
    }
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
};

const initialAuth = getInitialAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialAuth.user,
  token: initialAuth.token,
  isAuthenticated: !!(initialAuth.user && initialAuth.token),
  isLoading: false,



  checkAuth: async () => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    if (!token) return;
    
    try {
      const res = await apiClient.get('/users/me');
      const updatedUser = res.data.data;
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
      set({ user: updatedUser, isAuthenticated: true });
    } catch (e) {
      console.error('Failed to check auth', e);
      // Optional: clear auth state if token is invalid (handled by interceptor)
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    try {
      localStorage.removeItem('quiz-master-taking-storage');
    } catch {
      // Ignore
    }
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setUser: (user: User) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    set({ user });
  },

  setAuthSession: (user: User, token: string) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    set({ user, token, isAuthenticated: true });
  },
}));
