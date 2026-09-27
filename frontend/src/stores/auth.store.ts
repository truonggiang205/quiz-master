import { create } from 'zustand';
import { apiClient } from '../services/api';
import { User, UserRole } from '../types/user';
import { MOCK_USERS } from '../mocks/users';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  setAuthSession: (user: User, token: string) => void;
  quickLoginAs: (role: UserRole) => void;
  checkAuth: () => Promise<void>;
}

const STORAGE_USER_KEY = 'quizmaster_auth_user';
const STORAGE_TOKEN_KEY = 'quizmaster_auth_token';

const getSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const savedUser = getSavedUser();
const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

export const useAuthStore = create<AuthState>((set) => ({
  user: savedUser,
  token: savedToken,
  isAuthenticated: !!savedUser,
  isLoading: false,

  login: async (email: string, preferredRole?: UserRole) => {
    set({ isLoading: true });
    // Match existing mock user or build user
    let user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0],
        email,
        role: preferredRole || (email.includes('teacher') ? 'TEACHER' : 'STUDENT'),
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      };
    }
    const token = `mock-token-${user.role.toLowerCase()}-${user.id}`;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);

    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  quickLoginAs: (role: UserRole) => {
    const user = role === 'TEACHER' ? MOCK_USERS[0] : MOCK_USERS[1];
    const token = `mock-token-${role.toLowerCase()}-${user.id}`;
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

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
