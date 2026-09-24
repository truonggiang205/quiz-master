import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  children?: React.ReactNode;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary',
  children,
  isLoading = false,
}) => {
  const variantIcons = {
    primary: <AlertCircle className="w-6 h-6 text-indigo-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    danger: <AlertCircle className="w-6 h-6 text-rose-500" />,
    success: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
  };

  const confirmBtnStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200 dark:shadow-none',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-200 dark:shadow-none',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-200 dark:shadow-none',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200 dark:shadow-none',
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-700/80 overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700/60">
              {variantIcons[variant]}
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {description}
            </p>
          )}

          {children && <div className="mb-5">{children}</div>}

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${confirmBtnStyles[variant]}`}
            >
              {isLoading ? 'Đang xử lý...' : confirmText}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
