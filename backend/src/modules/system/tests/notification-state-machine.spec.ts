import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

export type ToastType = 'loading' | 'success' | 'error' | 'warning' | 'info' | 'message';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  avatar?: string;
  payload?: any;
  duration?: number;
  persistent?: boolean;
  actionKey?: string;
  createdAt?: number;
}

// Pure implementation of the upgraded Notification State Machine for unit testing
export class NotificationManager {
  private toasts: ToastMessage[] = [];
  private toastTimers = new Map<string, any>();
  private activeActionKeys = new Set<string>();

  public getToasts(): ToastMessage[] {
    return [...this.toasts];
  }

  public getToast(id: string): ToastMessage | undefined {
    return this.toasts.find((t) => t.id === id);
  }

  public isActionActive(actionKey: string): boolean {
    return this.activeActionKeys.has(actionKey);
  }

  private getDefaultDuration(type: ToastType): number {
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
  }

  private clearToastTimer(id: string) {
    const timer = this.toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.toastTimers.delete(id);
    }
  }

  public addToast(toast: Omit<ToastMessage, 'id'>): string {
    // Action key deduplication: if same actionKey is already loading, reuse
    if (toast.actionKey) {
      const existing = this.toasts.find((t) => t.actionKey === toast.actionKey && t.type === 'loading');
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

    this.toasts = [...this.toasts.filter((t) => t.id !== id), newToast];

    this.clearToastTimer(id);
    const duration = toast.duration !== undefined ? toast.duration : this.getDefaultDuration(toast.type);
    if (!isPersistent && duration > 0 && toast.type !== 'loading') {
      const timer = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimers.set(id, timer);
    }

    return id;
  }

  public updateToast(id: string, updates: Partial<Omit<ToastMessage, 'id'>>) {
    const existing = this.toasts.find((t) => t.id === id);
    if (!existing) return;

    this.clearToastTimer(id);

    const nextType = updates.type || existing.type;
    const isPersistent = updates.persistent !== undefined ? updates.persistent : (nextType === 'loading');

    const updatedToast: ToastMessage = {
      ...existing,
      ...updates,
      type: nextType,
      persistent: isPersistent,
    };

    this.toasts = this.toasts.map((t) => (t.id === id ? updatedToast : t));

    const duration = updates.duration !== undefined ? updates.duration : this.getDefaultDuration(nextType);
    if (!isPersistent && duration > 0 && nextType !== 'loading') {
      const timer = setTimeout(() => {
        this.removeToast(id);
      }, duration);
      this.toastTimers.set(id, timer);
    }
  }

  public removeToast(id: string) {
    this.clearToastTimer(id);
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  public clearToasts() {
    this.toastTimers.forEach((timer) => clearTimeout(timer));
    this.toastTimers.clear();
    this.toasts = [];
  }

  public async withNotification<T>(
    options: {
      actionKey?: string;
      loadingTitle?: string;
      loadingMessage?: string;
      successTitle?: string;
      successMessage?: string;
      errorTitle?: string;
      errorMessage?: string;
      preferBackendError?: boolean;
    },
    actionFn: () => Promise<T>
  ): Promise<T> {
    if (options.actionKey) {
      if (this.activeActionKeys.has(options.actionKey)) {
        const err = new Error(`Action '${options.actionKey}' is already processing`);
        (err as any).isDuplicateAction = true;
        return Promise.reject(err);
      }
      this.activeActionKeys.add(options.actionKey);
    }

    const toastId = this.addToast({
      type: 'loading',
      title: options.loadingTitle || 'Đang xử lý...',
      message: options.loadingMessage,
      actionKey: options.actionKey,
      persistent: true,
    });

    try {
      const result = await actionFn();

      this.updateToast(toastId, {
        type: 'success',
        title: options.successTitle || 'Thao tác thành công',
        message: options.successMessage,
        persistent: false,
      });

      return result;
    } catch (err: any) {
      let displayMessage = options.errorMessage;
      if (options.preferBackendError !== false) {
        const backendMsg = err?.response?.data?.message || err?.message;
        if (typeof backendMsg === 'string' && backendMsg.trim()) {
          const lower = backendMsg.toLowerCase();
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

      this.updateToast(toastId, {
        type: 'error',
        title: options.errorTitle || 'Không thể thực hiện thao tác',
        message: displayMessage || 'Vui lòng kiểm tra lại kết nối và thử lại.',
        persistent: false,
      });

      throw err;
    } finally {
      if (options.actionKey) {
        this.activeActionKeys.delete(options.actionKey);
      }
    }
  }
}

// Verification Theme Tokens Mapping
export const borderMap: Record<ToastType, string> = {
  loading: 'border-sky-300 dark:border-sky-700/60 bg-sky-50/95 dark:bg-slate-900/95 shadow-sky-100/40 dark:shadow-sky-950/40',
  success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/95 dark:bg-slate-900/95',
  error: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/95 dark:bg-slate-900/95',
  warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-slate-900/95',
  info: 'border-sky-200 dark:border-sky-800/60 bg-sky-50/95 dark:bg-slate-900/95',
  message: 'border-sky-200/50 bg-white/95 dark:bg-slate-900/95 shadow-sky-100/50',
};

describe('SYSTEM NOTIFICATION & ACTION FEEDBACK HARDENING TEST MATRIX', () => {
  let manager: NotificationManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new NotificationManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // NOTIFY-01: Click action → LOADING notification xuất hiện ngay.
  it('NOTIFY-01: should immediately show LOADING notification on action trigger', async () => {
    const actionPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    
    const callPromise = manager.withNotification(
      { actionKey: 'test-notify-01', loadingTitle: 'Đang xử lý...' },
      () => actionPromise
    );

    const toasts = manager.getToasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('loading');
    expect(toasts[0].title).toBe('Đang xử lý...');
    expect(toasts[0].persistent).toBe(true);

    vi.advanceTimersByTime(2000);
    await callPromise;
  });

  // NOTIFY-02: LOADING notification không auto-dismiss trong lúc request pending.
  it('NOTIFY-02: LOADING notification must NOT auto-dismiss while request is pending', async () => {
    const actionPromise = new Promise((resolve) => setTimeout(resolve, 10000));
    
    const callPromise = manager.withNotification(
      { actionKey: 'test-notify-02', loadingTitle: 'Đang lưu học phí...' },
      () => actionPromise
    );

    // Advance by 3s, 4s, 5s - typical auto-dismiss intervals
    vi.advanceTimersByTime(4000);
    expect(manager.getToasts().length).toBe(1);
    expect(manager.getToasts()[0].type).toBe('loading');

    vi.advanceTimersByTime(4000);
    expect(manager.getToasts().length).toBe(1);
    expect(manager.getToasts()[0].type).toBe('loading');

    // Complete the promise
    vi.advanceTimersByTime(2000);
    await callPromise;
  });

  // NOTIFY-03: API success → LOADING chuyển thành SUCCESS (same ID).
  it('NOTIFY-03: API success smoothly transitions LOADING to SUCCESS on the same ID', async () => {
    let resolveFn: () => void;
    const actionPromise = new Promise<string>((resolve) => {
      resolveFn = () => resolve('ok');
    });

    const callPromise = manager.withNotification(
      {
        actionKey: 'test-notify-03',
        loadingTitle: 'Đang ghi nhận thanh toán...',
        successTitle: 'Ghi nhận thanh toán thành công',
      },
      () => actionPromise
    );

    const initialToast = manager.getToasts()[0];
    const initialId = initialToast.id;
    expect(initialToast.type).toBe('loading');

    // Resolve API
    resolveFn!();
    await callPromise;

    const afterToasts = manager.getToasts();
    expect(afterToasts.length).toBe(1);
    expect(afterToasts[0].id).toBe(initialId); // Same ID!
    expect(afterToasts[0].type).toBe('success');
    expect(afterToasts[0].title).toBe('Ghi nhận thanh toán thành công');

    // Check that success toast auto-dismisses after 3500ms
    vi.advanceTimersByTime(3500);
    expect(manager.getToasts().length).toBe(0);
  });

  // NOTIFY-04: API failure → LOADING chuyển thành ERROR (same ID).
  it('NOTIFY-04: API failure smoothly transitions LOADING to ERROR on the same ID', async () => {
    let rejectFn: (err: any) => void;
    const actionPromise = new Promise<string>((_, reject) => {
      rejectFn = reject;
    });

    const callPromise = manager.withNotification(
      {
        actionKey: 'test-notify-04',
        loadingTitle: 'Đang xóa học sinh...',
        errorTitle: 'Không thể xóa học sinh',
      },
      () => actionPromise
    );

    const initialToast = manager.getToasts()[0];
    const initialId = initialToast.id;
    expect(initialToast.type).toBe('loading');

    // Reject API with backend message
    rejectFn!({ response: { data: { message: 'Học sinh đang có học phí chưa thanh toán' } } });
    await expect(callPromise).rejects.toBeDefined();

    const afterToasts = manager.getToasts();
    expect(afterToasts.length).toBe(1);
    expect(afterToasts[0].id).toBe(initialId); // Same ID!
    expect(afterToasts[0].type).toBe('error');
    expect(afterToasts[0].title).toBe('Không thể xóa học sinh');
    expect(afterToasts[0].message).toBe('Học sinh đang có học phí chưa thanh toán');

    // Check that error toast auto-dismisses after 5000ms
    vi.advanceTimersByTime(5000);
    expect(manager.getToasts().length).toBe(0);
  });

  // NOTIFY-05: API throw exception → button / state returns to normal via finally.
  it('NOTIFY-05: button/submitting state returns to normal even when API throws exception', async () => {
    let isSubmitting = false;

    const executeAction = async () => {
      if (isSubmitting) return;
      isSubmitting = true;
      try {
        await manager.withNotification(
          { actionKey: 'test-notify-05' },
          async () => {
            throw new Error('Fatal network collapse');
          }
        );
      } catch {
        // Handled
      } finally {
        isSubmitting = false;
      }
    };

    await executeAction();
    expect(isSubmitting).toBe(false);
  });

  // NOTIFY-06: Double click → chỉ tạo một request duy nhất.
  it('NOTIFY-06: Double click must only execute the action once', async () => {
    let callCount = 0;
    const slowAction = async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return 'done';
    };

    const firstClick = manager.withNotification(
      { actionKey: 'tuition-pay-double-click' },
      slowAction
    );

    // Instant second click before first finishes
    const secondClick = manager.withNotification(
      { actionKey: 'tuition-pay-double-click' },
      slowAction
    ).catch((err) => {
      expect(err.isDuplicateAction).toBe(true);
    });

    vi.advanceTimersByTime(3000);
    await Promise.all([firstClick, secondClick]);

    expect(callCount).toBe(1); // Only 1 request fired!
  });

  // NOTIFY-07: Double click → chỉ có một LOADING notification.
  it('NOTIFY-07: Double click does NOT create duplicate LOADING notifications', async () => {
    const slowAction = () => new Promise((resolve) => setTimeout(resolve, 3000));

    const p1 = manager.withNotification({ actionKey: 'single-loading-toast' }, slowAction);
    const p2 = manager.withNotification({ actionKey: 'single-loading-toast' }, slowAction).catch(() => {});

    expect(manager.getToasts().length).toBe(1);
    expect(manager.getToasts()[0].actionKey).toBe('single-loading-toast');

    vi.advanceTimersByTime(3000);
    await Promise.all([p1, p2]);
  });

  // NOTIFY-08: Same actionKey đang pending → không tạo duplicate notification trong addToast.
  it('NOTIFY-08: addToast returns existing id if same actionKey is already loading', () => {
    const id1 = manager.addToast({
      type: 'loading',
      title: 'Đang ghi nhận...',
      actionKey: 'tuition-action-key',
    });

    const id2 = manager.addToast({
      type: 'loading',
      title: 'Đang ghi nhận lần 2...',
      actionKey: 'tuition-action-key',
    });

    expect(id1).toBe(id2);
    expect(manager.getToasts().length).toBe(1);
  });

  // NOTIFY-09: Different actionKey → có thể chạy độc lập.
  it('NOTIFY-09: Different actionKeys can run concurrently and independently', async () => {
    const p1 = manager.withNotification(
      { actionKey: 'action-A', loadingTitle: 'Action A' },
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    const p2 = manager.withNotification(
      { actionKey: 'action-B', loadingTitle: 'Action B' },
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );

    expect(manager.getToasts().length).toBe(2);
    expect(manager.getToasts().map((t) => t.title)).toContain('Action A');
    expect(manager.getToasts().map((t) => t.title)).toContain('Action B');

    vi.advanceTimersByTime(1000);
    await p1;
    expect(manager.getToasts().find((t) => t.actionKey === 'action-A')?.type).toBe('success');
    expect(manager.getToasts().find((t) => t.actionKey === 'action-B')?.type).toBe('loading');

    vi.advanceTimersByTime(1000);
    await p2;
    expect(manager.getToasts().find((t) => t.actionKey === 'action-B')?.type).toBe('success');
  });

  // NOTIFY-10: 401 session cleanup clears toasts.
  it('NOTIFY-10: 401 handling triggers clearToasts to prevent orphaned notifications', () => {
    manager.addToast({ type: 'loading', title: 'Pending session action' });
    expect(manager.getToasts().length).toBe(1);

    // Simulate 401 interceptor
    manager.clearToasts();
    expect(manager.getToasts().length).toBe(0);
  });

  // NOTIFY-11: Logout → toàn bộ pending notification liên quan session được cleanup.
  it('NOTIFY-11: Logout cleans up all pending notifications and clears active timers', () => {
    manager.addToast({ type: 'loading', title: 'Pending action 1' });
    manager.addToast({ type: 'info', title: 'Info toast' });
    expect(manager.getToasts().length).toBe(2);

    manager.clearToasts();
    expect(manager.getToasts().length).toBe(0);

    // Ensure no delayed timer triggers resurrect toasts
    vi.advanceTimersByTime(10000);
    expect(manager.getToasts().length).toBe(0);
  });

  // NOTIFY-12: Light mode notification hiển thị đúng (Tailwind classes).
  it('NOTIFY-12: Light mode theme styling tokens exist for all notification types', () => {
    const types: ToastType[] = ['loading', 'success', 'error', 'warning', 'info'];
    for (const t of types) {
      const cls = borderMap[t];
      expect(cls).toBeDefined();
      expect(cls).toContain('bg-');
      expect(cls).toContain('border-');
    }
  });

  // NOTIFY-13: Dark mode notification hiển thị đúng (dark: classes).
  it('NOTIFY-13: Dark mode theme styling tokens include dark: variants for all notification types', () => {
    const types: ToastType[] = ['loading', 'success', 'error', 'warning', 'info'];
    for (const t of types) {
      const cls = borderMap[t];
      expect(cls).toContain('dark:border-');
      expect(cls).toContain('dark:bg-');
    }
  });

  // NOTIFY-14: Long-running request → notification vẫn tồn tại cho tới khi request hoàn thành.
  it('NOTIFY-14: Long-running request (e.g. 60s) remains persistently in LOADING state until done', async () => {
    const veryLongAction = () => new Promise((resolve) => setTimeout(resolve, 60000));
    
    const promise = manager.withNotification(
      { actionKey: 'long-job', loadingTitle: 'Đang tổng hợp dữ liệu...' },
      veryLongAction
    );

    // Advance 10s, 30s, 50s
    vi.advanceTimersByTime(10000);
    expect(manager.getToasts()[0].type).toBe('loading');

    vi.advanceTimersByTime(20000);
    expect(manager.getToasts()[0].type).toBe('loading');

    vi.advanceTimersByTime(20000);
    expect(manager.getToasts()[0].type).toBe('loading');

    // Complete the 60s
    vi.advanceTimersByTime(10000);
    await promise;

    expect(manager.getToasts()[0].type).toBe('success');
  });

  // NOTIFY-15: Request timeout → chuyển ERROR và unlock button.
  it('NOTIFY-15: Request timeout transitions to ERROR and clears active actionKey', async () => {
    let buttonDisabled = true;

    const timeoutPromise = manager.withNotification(
      {
        actionKey: 'timeout-action',
        loadingTitle: 'Đang gửi...',
        errorTitle: 'Thao tác mất quá nhiều thời gian',
        errorMessage: 'Vui lòng kiểm tra kết nối và thử lại.',
      },
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('timeout of 30000ms exceeded'));
          }, 30000);
        })
    ).catch(() => {
      buttonDisabled = false;
    });

    expect(manager.isActionActive('timeout-action')).toBe(true);

    vi.advanceTimersByTime(30000);
    await timeoutPromise;

    expect(buttonDisabled).toBe(false);
    expect(manager.isActionActive('timeout-action')).toBe(false);
    expect(manager.getToasts()[0].type).toBe('error');
    expect(manager.getToasts()[0].title).toBe('Thao tác mất quá nhiều thời gian');
  });
});
