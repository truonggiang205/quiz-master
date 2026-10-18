import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { formatUserName } from '../../utils/user.utils';
import {
  Menu,
  GraduationCap,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  showSidebarToggle?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ showSidebarToggle = false }) => {
  const { user, logout } = useAuthStore();
  const { isSidebarOpen, toggleSidebar } = useUiStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              onClick={toggleSidebar}
              id="sidebar-toggle-btn"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <Link
            to="/"
            className={`items-center gap-2.5 group transition-all duration-200 ${
              showSidebarToggle && !isSidebarOpen ? 'hidden md:hidden' : 'flex'
            }`}
          >
            <img 
              src="/logo.png" 
              alt="QuizMaster Logo" 
              className="h-9 w-auto max-w-[140px] object-contain transition-transform group-hover:scale-105" 
            />
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {user && <NotificationBell />}
          <ThemeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                id="user-menu-btn"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-sky-200 dark:ring-sky-900"
                />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                    {formatUserName(user)}
                  </span>
                  <span className="text-[10px] font-semibold text-sky-500 dark:text-sky-400 uppercase">
                    {user.role === 'TEACHER' ? 'Giáo Viên' : 'Học Sinh'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatUserName(user)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>

                  <Link
                    to={user.role === 'TEACHER' ? '/teacher/profile' : '/student/profile'}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Hồ sơ cá nhân
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200 dark:shadow-none transition-all"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
