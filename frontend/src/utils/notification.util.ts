import { useUiStore, ToastMessage } from '../stores/ui.store';

export interface WithNotificationOptions {
  actionKey?: string;
  loadingTitle?: string;
  loadingMessage?: string;
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorMessage?: string;
  preferBackendError?: boolean;
}

// Global in-memory set to prevent duplicate in-flight async actions
const activeActionKeys = new Set<string>();

/**
 * Executes an async action with immediate UI feedback, persistent loading notification,
 * in-place transition to success/error, and duplicate submission prevention.
 */
export async function withNotification<T>(
  options: WithNotificationOptions,
  actionFn: () => Promise<T>
): Promise<T> {
  // 1. Double invocation / spam guard
  if (options.actionKey) {
    if (activeActionKeys.has(options.actionKey)) {
      console.warn(`[withNotification] Action '${options.actionKey}' is already processing. Ignoring duplicate.`);
      const duplicateError = new Error(`Action '${options.actionKey}' is already processing`);
      (duplicateError as any).isDuplicateAction = true;
      return Promise.reject(duplicateError);
    }
    activeActionKeys.add(options.actionKey);
  }

  // 2. Immediate loading notification (persistent, no premature auto-dismiss)
  const toastId = useUiStore.getState().addToast({
    type: 'loading',
    title: options.loadingTitle || 'Đang xử lý...',
    message: options.loadingMessage,
    actionKey: options.actionKey,
    persistent: true,
  });

  try {
    const result = await actionFn();

    // 3. In-place transition to SUCCESS (same notification ID)
    useUiStore.getState().updateToast(toastId, {
      type: 'success',
      title: options.successTitle || 'Thao tác thành công',
      message: options.successMessage,
      persistent: false,
    });

    return result;
  } catch (err: any) {
    // 4. In-place transition to ERROR
    let displayMessage = options.errorMessage;
    if (options.preferBackendError !== false) {
      const backendMsg = err?.response?.data?.message || err?.message;
      if (typeof backendMsg === 'string' && backendMsg.trim()) {
        const lower = backendMsg.toLowerCase();
        // Prevent internal technical leaks
        if (
          !lower.includes('internal server') &&
          !lower.includes('syntaxerror') &&
          !lower.includes('prisma') &&
          !lower.includes('typeorm') &&
          !lower.includes('sql') &&
          !lower.includes('stack')
        ) {
          displayMessage = backendMsg;
        }
      }
    }

    useUiStore.getState().updateToast(toastId, {
      type: 'error',
      title: options.errorTitle || 'Không thể thực hiện thao tác',
      message: displayMessage || 'Vui lòng kiểm tra lại kết nối và thử lại.',
      persistent: false,
    });

    throw err;
  } finally {
    // 5. Always clean up actionKey from active set
    if (options.actionKey) {
      activeActionKeys.delete(options.actionKey);
    }
  }
}

/**
 * Convenient notification API
 */
export const notify = {
  loading: (title: string, message?: string, actionKey?: string) =>
    useUiStore.getState().addToast({
      type: 'loading',
      title,
      message,
      actionKey,
      persistent: true,
    }),

  success: (title: string, message?: string) =>
    useUiStore.getState().addToast({
      type: 'success',
      title,
      message,
    }),

  error: (title: string, message?: string) =>
    useUiStore.getState().addToast({
      type: 'error',
      title,
      message,
    }),

  warning: (title: string, message?: string) =>
    useUiStore.getState().addToast({
      type: 'warning',
      title,
      message,
    }),

  info: (title: string, message?: string) =>
    useUiStore.getState().addToast({
      type: 'info',
      title,
      message,
    }),

  update: (id: string, updates: Partial<Omit<ToastMessage, 'id'>>) =>
    useUiStore.getState().updateToast(id, updates),

  dismiss: (id: string) =>
    useUiStore.getState().removeToast(id),

  clear: () =>
    useUiStore.getState().clearToasts(),

  isActionActive: (actionKey: string) =>
    activeActionKeys.has(actionKey),
};
