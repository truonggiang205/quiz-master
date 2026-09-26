import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/auth.store';
import {
  Users,
  LayoutDashboard,
  ShieldAlert,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  Bug
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Quản lý người dùng', path: '/admin/users', icon: Users },
    { name: 'Kiểm duyệt nội dung', path: '/admin/content', icon: ShieldAlert },
    { name: 'Báo cáo người dùng', path: '/admin/reports', icon: Bug },
    { name: 'Cấu hình hệ thống', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full relative">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
            <Shield className="w-6 h-6 text-indigo-500" />
            <span>Admin Panel</span>
          </Link>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold relative ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-active-nav"
                    className="absolute inset-0 rounded-xl bg-indigo-600 shadow-md shadow-indigo-900/50 -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                  />
                )}
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <img src={user?.avatar} alt="Admin" className="w-8 h-8 rounded-full border border-slate-700" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-[100dvh]">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>Admin</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="text-slate-900 capitalize">
              {location.pathname.split('/').pop()?.replace('-', ' ')}
            </span>
          </div>
        </header>

        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
