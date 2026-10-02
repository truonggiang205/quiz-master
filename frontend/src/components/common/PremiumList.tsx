import React, { ReactNode } from 'react';

interface PremiumListProps {
  children: ReactNode;
  className?: string;
}

export const PremiumList: React.FC<PremiumListProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full mx-auto ${className}`}>
      <div className="bg-white rounded-2xl shadow-[0_12px_35px_rgba(15,23,42,0.08),0_3px_8px_rgba(15,23,42,0.04)] overflow-hidden border border-slate-100 flex flex-col">
        {children}
      </div>
    </div>
  );
};

export interface PremiumListItemProps {
  onClick?: () => void;
  avatar?: ReactNode;
  rightAction?: ReactNode;
  children: ReactNode;
  className?: string;
  hoverColorClass?: string; // ví dụ: 'bg-sky-600', 'bg-emerald-500'
}

export const PremiumListItem: React.FC<PremiumListItemProps> = ({
  onClick,
  avatar,
  rightAction,
  children,
  className = '',
  hoverColorClass = 'bg-sky-600',
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center p-4 sm:p-5 bg-white hover:bg-slate-50 transition-colors duration-300 border-b border-slate-100 last:border-b-0 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Vạch màu xuất hiện bên trái khi hover */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${hoverColorClass} scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center z-10`}
      />

      {/* Cột trái: Avatar / Icon */}
      {avatar && <div className="relative flex-shrink-0 z-0">{avatar}</div>}

      {/* Cột giữa: Nội dung chính */}
      <div className="ml-4 flex-1 min-w-0 z-0">{children}</div>

      {/* Cột phải: Hành động / Badge / Icon */}
      {rightAction && <div className="ml-4 flex-shrink-0 z-0">{rightAction}</div>}
    </div>
  );
};
