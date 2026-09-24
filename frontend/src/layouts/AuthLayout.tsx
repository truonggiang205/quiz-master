import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-pastel-mesh dark:bg-slate-950 flex flex-col justify-between p-4 md:p-8 font-sans transition-colors relative">
      {/* Header with logo & theme toggle */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center">
          <img 
            src="/logo.png" 
            alt="QuizMaster Logo" 
            className="h-10 md:h-12 w-auto object-contain transition-transform transform scale-[1.75] origin-left hover:scale-[1.85]" 
          />
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
