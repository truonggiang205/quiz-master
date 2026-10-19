import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Logo } from '../components/common/Logo';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-[100dvh] bg-pastel-mesh dark:bg-slate-950 flex flex-col justify-between p-4 md:p-8 font-sans transition-colors relative overflow-x-hidden w-full">
      {/* Header with logo & theme toggle */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2.5 group">
          <Logo 
            className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105" 
            alt="QuizMaster" 
          />
          <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">
            QuizMaster
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
        © 2026 QuizMaster. Nền tảng kiểm tra trực tuyến thế hệ mới.
      </div>
    </div>
  );
};
