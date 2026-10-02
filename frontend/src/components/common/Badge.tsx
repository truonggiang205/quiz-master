import React from 'react';

export type BadgeVariant =
  | 'lavender'
  | 'mint'
  | 'peach'
  | 'rose'
  | 'sky'
  | 'amber'
  | 'slate';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  lavender:
    'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
  mint:
    'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  peach:
    'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
  rose:
    'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
  sky:
    'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
  amber:
    'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  slate:
    'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'lavender',
  size = 'md',
  className = '',
}) => {
  const sizeStyle = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs md:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm transition-colors ${sizeStyle} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
