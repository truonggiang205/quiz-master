import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { motion, AnimatePresence } from 'framer-motion';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useUiStore();

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label="Toggle theme"
      className="relative w-[44px] h-[44px] flex items-center justify-center rounded-xl text-sky-700 hover:text-sky-600 dark:text-sky-600 dark:hover:text-sky-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-slate-700/80 transition-all duration-200 border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-sky-300 overflow-hidden"
      title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute"
          >
            <Sun className="w-5 h-5 text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ y: -20, opacity: 0, rotate: 90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: -90 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute"
          >
            <Moon className="w-5 h-5 text-sky-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};
