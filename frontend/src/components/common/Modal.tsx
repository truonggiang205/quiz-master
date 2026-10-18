import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
}

const maxWidthClasses: Record<NonNullable<ModalProps['maxWidth']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
};

/**
 * Standard Global Modal / Dialog System for QuizMaster
 * - Renders via React Portal directly into document.body (escapes parent layout/transform constraints)
 * - Guarantees proper viewport-safe sizing (max-height with safety margins on all resolutions)
 * - Pinned Header (flex-shrink-0)
 * - Independent Scrollable Body (flex-1 min-h-0 overflow-y-auto)
 * - Pinned Footer (flex-shrink-0, always visible and clickable)
 * - Background body scroll lock while open
 * - ESC key and backdrop click support
 * - Z-index: z-[1000], cleanly overlays floating chat (z-50) and header (z-30)
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  maxWidth = 'lg',
  onSubmit,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  showCloseButton = true,
}) => {
  // ESC key support
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift when scrollbar is hidden
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] md:max-h-[min(90vh,840px)] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden ${className}`}
            role="dialog"
            aria-modal="true"
          >
            {/* Pinned Header */}
            {(title || showCloseButton) && (
              <div
                className={`flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 ${headerClassName}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  {icon && <div className="shrink-0">{icon}</div>}
                  <div className="min-w-0">
                    {typeof title === 'string' ? (
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {description}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 -mr-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    aria-label="Close dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Form Wrap vs Div Wrap */}
            {onSubmit ? (
              <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Body */}
                <div
                  className={`flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 custom-scrollbar space-y-4 ${bodyClassName}`}
                >
                  {children}
                </div>

                {/* Pinned Footer */}
                {footer && (
                  <div
                    className={`flex items-center justify-end gap-3 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 ${footerClassName}`}
                  >
                    {footer}
                  </div>
                )}
              </form>
            ) : (
              <>
                {/* Scrollable Body */}
                <div
                  className={`flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 custom-scrollbar ${bodyClassName}`}
                >
                  {children}
                </div>

                {/* Pinned Footer */}
                {footer && (
                  <div
                    className={`flex items-center justify-end gap-3 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 ${footerClassName}`}
                  >
                    {footer}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
