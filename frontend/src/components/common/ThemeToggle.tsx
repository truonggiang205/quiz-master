import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useUiStore();

  return (
    <button
      onClick={toggleTheme}
      id="theme-toggle-btn"
      aria-label="Toggle theme"
      className="relative w-[44px] h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-slate-700/80 transition-all duration-200 border border-slate-200/60 dark:border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-indigo-500 transition-transform -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};
