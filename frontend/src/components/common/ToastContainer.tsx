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
  };

  const borderMap = {
    success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/95 dark:bg-slate-900/95',
    error: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/95 dark:bg-slate-900/95',
    warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/95 dark:bg-slate-900/95',
    info: 'border-sky-200 dark:border-sky-800/60 bg-sky-50/95 dark:bg-slate-900/95',
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <AnimatePresence initial={false}>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ willChange: 'opacity, transform' }}
          className={`pointer-events-auto p-4 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 ${borderMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
      </AnimatePresence>
    </div>
  );
};
