import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'message';
  title: string;
  message?: string;
  avatar?: string;
  payload?: any;
  duration?: number;
}

export interface ConfirmConfig {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

interface UiState {
  theme: 'light' | 'dark';
  isSidebarOpen: boolean;
  toasts: ToastMessage[];
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  confirmConfig: ConfirmConfig | null;
  confirm: (config: Omit<ConfirmConfig, 'onConfirm' | 'onCancel'>) => Promise<boolean>;
  hideConfirm: () => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('quizmaster_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

export const useUiStore = create<UiState>((set, get) => ({
  theme: getInitialTheme(),
  isSidebarOpen: true,
  toasts: [],

  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('quizmaster_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  setTheme: (theme: 'light' | 'dark') => {
    localStorage.setItem('quizmaster_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen: boolean) => set({ isSidebarOpen: isOpen }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    // Auto dismiss
    const duration = toast.duration !== undefined ? toast.duration : 4000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },

  confirmConfig: null,
  confirm: (config) => {
    return new Promise((resolve) => {
      set({
        confirmConfig: {
          ...config,
          onConfirm: () => {
            set({ confirmConfig: null });
            resolve(true);
          },
          onCancel: () => {
            set({ confirmConfig: null });
            resolve(false);
          },
        },
      });
    });
  },
  hideConfirm: () => set({ confirmConfig: null }),
}));
