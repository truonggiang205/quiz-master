import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 font-sans">
          <div className="max-w-md w-full p-6 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-rose-200 dark:border-rose-900/50 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              Đã xảy ra lỗi giao diện
            </h2>
            <p className="text-xs text-rose-500 font-mono bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl mb-4 text-left overflow-auto max-h-36">
              {this.state.error?.toString()}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
