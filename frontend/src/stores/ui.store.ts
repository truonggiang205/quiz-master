import { create } from 'zustand';

export type ToastType = 'loading' | 'success' | 'error' | 'warning' | 'info' | 'message';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  avatar?: string | null;
  payload?: any;
  duration?: number;
  persistent?: boolean;
  actionKey?: string;
  createdAt?: number;
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
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  updateToast: (id: string, updates: Partial<Omit<ToastMessage, 'id'>>) => void;
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

const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

const clearToastTimer = (id: string) => {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }
};

const getDefaultDuration = (type: ToastType): number => {
  switch (type) {
    case 'loading':
      return 0; // Persistent by default
    case 'success':
      return 3500;
    case 'error':
      return 5000;
    case 'warning':
    case 'info':
      return 4000;
    case 'message':
      return 5000;
    default:
      return 4000;
  }
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
    const state = get();
    // Action key deduplication: If an existing toast with the same actionKey is currently 'loading', reuse it
    if (toast.actionKey) {
      const existing = state.toasts.find((t) => t.actionKey === toast.actionKey && t.type === 'loading');
      if (existing) {
        return existing.id;
      }
    }

    const id = toast.actionKey ? `toast-${toast.actionKey}` : `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const isPersistent = toast.persistent ?? (toast.type === 'loading');
    const newToast: ToastMessage = {
      ...toast,
      id,
      persistent: isPersistent,
      createdAt: toast.createdAt || Date.now(),
    };

    set((s) => ({ toasts: [...s.toasts.filter((t) => t.id !== id), newToast] }));

    // Auto dismiss logic: ONLY if duration > 0 and NOT loading and NOT persistent
    clearToastTimer(id);
    const duration = toast.duration !== undefined ? toast.duration : getDefaultDuration(toast.type);
    if (!isPersistent && duration > 0 && toast.type !== 'loading') {
      const timer = setTimeout(() => {
        get().removeToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }

    return id;
  },

  updateToast: (id, updates) => {
    const existing = get().toasts.find((t) => t.id === id);
    if (!existing) return;

    clearToastTimer(id);

    const nextType = updates.type || existing.type;
    const isPersistent = updates.persistent !== undefined ? updates.persistent : (nextType === 'loading');

    const updatedToast: ToastMessage = {
      ...existing,
      ...updates,
      type: nextType,
      persistent: isPersistent,
    };

    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? updatedToast : t)),
    }));

    const duration = updates.duration !== undefined ? updates.duration : getDefaultDuration(nextType);
    if (!isPersistent && duration > 0 && nextType !== 'loading') {
      const timer = setTimeout(() => {
        get().removeToast(id);
      }, duration);
      toastTimers.set(id, timer);
    }
  },

  removeToast: (id: string) => {
    clearToastTimer(id);
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearToasts: () => {
    toastTimers.forEach((timer) => clearTimeout(timer));
    toastTimers.clear();
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
