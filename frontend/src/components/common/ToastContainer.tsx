import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../stores/ui.store';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUiStore();

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />,
    message: null, // Custom handled below
  };

  const borderMap = {
    success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/95 dark:bg-slate-900/95',
    error: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/95 dark:bg-slate-900/95',
    warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-slate-900/95',
    info: 'border-sky-200 dark:border-sky-800/60 bg-sky-50/95 dark:bg-slate-900/95',
    message: 'border-indigo-200/50 bg-white/95 dark:bg-slate-900/95 shadow-indigo-100/50',
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
          className={`pointer-events-auto p-3 sm:p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 relative overflow-hidden group cursor-pointer ${borderMap[toast.type]} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}
          onClick={() => {
            if (toast.type === 'message' && toast.payload) {
              window.dispatchEvent(new CustomEvent('openChat', { detail: { user: toast.payload } }));
            }
            removeToast(toast.id);
          }}
        >
          {/* Animated glow effect for message toast */}
          {toast.type === 'message' && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          )}

          {toast.type === 'message' && toast.avatar ? (
            <div className="relative shrink-0">
              <img src={toast.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-100 shadow-sm" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
          ) : (
            toast.type !== 'message' && iconMap[toast.type]
          )}
          
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-[13px] sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-2">
              {toast.title}
              {toast.type === 'message' && <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-rose-200">MỚI</span>}
            </h4>
            {toast.message && (
              <p className="text-[12px] sm:text-[13px] text-slate-600 dark:text-slate-300 mt-1 leading-snug line-clamp-2">
                {toast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors absolute top-2 right-2 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
};
