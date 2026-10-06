import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'lavender' | 'mint' | 'peach' | 'sky' | 'rose';
  trend?: string;
  delay?: number;
  onClick?: () => void;
  clickableHint?: string;
}

const variantStyles = {
  lavender: {
    iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
    border: 'border-sky-100/80 dark:border-sky-900/40',
    glow: 'group-hover:border-sky-300 dark:group-hover:border-sky-700',
  },
  mint: {
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    border: 'border-emerald-100/80 dark:border-emerald-900/40',
    glow: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700',
  },
  peach: {
    iconBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400',
    border: 'border-orange-100/80 dark:border-orange-900/40',
    glow: 'group-hover:border-orange-300 dark:group-hover:border-orange-700',
  },
  sky: {
    iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400',
    border: 'border-sky-100/80 dark:border-sky-900/40',
    glow: 'group-hover:border-sky-300 dark:group-hover:border-sky-700',
  },
  rose: {
    iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
    border: 'border-rose-100/80 dark:border-rose-900/40',
    glow: 'group-hover:border-rose-300 dark:group-hover:border-rose-700',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'lavender',
  trend,
  delay = 0,
  onClick,
  clickableHint,
}) => {
  const styles = variantStyles[variant];
  const isClickable = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`group relative p-5 bg-white/90 dark:bg-slate-800/90 rounded-3xl border ${styles.border} ${styles.glow} shadow-sm backdrop-blur-sm select-none ${
        isClickable
          ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400'
          : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          {title}
          {isClickable && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-70 group-hover:opacity-100" />
          )}
        </span>
        <div className={`p-2.5 rounded-2xl ${styles.iconBg} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </p>
        )}
        {clickableHint && isClickable && (
          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-auto">
            {clickableHint} →
          </span>
        )}
      </div>
    </motion.div>
  );
};
