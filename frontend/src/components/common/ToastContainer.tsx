import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore, ToastType } from '../../stores/ui.store';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  const iconMap: Record<ToastType, React.ReactNode> = {
    loading: <Loader2 className="w-5 h-5 text-sky-500 animate-spin flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />,
    message: null, // Custom handled below
  };

  const borderMap: Record<ToastType, string> = {
    loading: 'border-sky-300 dark:border-sky-700/60 bg-sky-50/95 dark:bg-slate-900/95 shadow-sky-100/40 dark:shadow-sky-950/40',
    success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/95 dark:bg-slate-900/95',
    error: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/95 dark:bg-slate-900/95',
    warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-slate-900/95',
    info: 'border-sky-200 dark:border-sky-800/60 bg-sky-50/95 dark:bg-slate-900/95',
    message: 'border-sky-200/50 bg-white/95 dark:bg-slate-900/95 shadow-sky-100/50',
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 sm:bottom-5 sm:top-auto sm:right-5 z-[9999] flex flex-col gap-3 max-w-[320px] w-full pointer-events-none">
      <AnimatePresence initial={false}>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400, mass: 0.8 }}
          className={`pointer-events-auto p-3 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 relative overflow-hidden group ${
            toast.type === 'loading' ? 'cursor-default' : 'cursor-pointer hover:-translate-y-1 hover:shadow-2xl'
          } ${borderMap[toast.type] || borderMap.info} transition-all duration-300`}
          onClick={() => {
            if (toast.type === 'loading') return;
            if (toast.type === 'message' && toast.payload) {
              window.dispatchEvent(new CustomEvent('openChat', { detail: { user: toast.payload } }));
            }
            removeToast(toast.id);
          }}
        >
          {/* Animated bottom progress line for loading state */}
          {toast.type === 'loading' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-200/60 dark:bg-sky-900/60 overflow-hidden">
              <div className="h-full bg-sky-500 dark:bg-sky-400 w-full animate-pulse" />
            </div>
          )}

          {/* Animated glow effect for message toast */}
          {toast.type === 'message' && (
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}

          {toast.type === 'message' ? (
            <div className="relative shrink-0">
              <UserAvatar
                src={toast.avatar}
                name={toast.title}
                size="header"
                ring
                ringColor="ring-sky-100"
                className="shadow-sm"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
          ) : (
            <div className="transition-all duration-200 shrink-0">
              {iconMap[toast.type] || iconMap.info}
            </div>
          )}
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-[13px] sm:text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 flex items-center gap-2 leading-snug">
              {toast.title}
              {toast.type === 'message' && <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-200">MỚI</span>}
            </h4>
            {toast.message && (
              <p className="text-[12px] sm:text-[13px] text-slate-600 dark:text-slate-300 mt-1 leading-snug line-clamp-2">
                {toast.message}
              </p>
            )}
          </div>

          {toast.type !== 'loading' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors absolute top-2 right-2 shrink-0"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
};
