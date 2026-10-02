import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import {
  LayoutDashboard,
  FileQuestion,
  PlusCircle,
  User,
  Users,
  UserPlus,
  X,
  Home,
  BookOpen,
  FileText,
  AlertCircle,
  Upload,
  Database,
  Bug,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const isTeacher = user?.role === 'TEACHER';

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, setSidebarOpen]);

  const teacherNavItems = [
    { label: 'Tổng Quan', path: '/teacher/dashboard', icon: Home },
    { label: 'Học Sinh', path: '/teacher/students', icon: Users },
    { label: 'Khóa Học', path: '/teacher/classrooms', icon: BookOpen },
    { label: 'Kết quả ôn tập và kiểm tra', path: '/teacher/quizzes', icon: FileText },
    { label: 'Tạo bài thi mới', path: '/teacher/quizzes/create', icon: PlusCircle },
    { label: 'Phúc Khảo', path: '/teacher/appeals', icon: AlertCircle },
    { label: 'Ngân hàng đề', path: '/teacher/bank', icon: Database },
    { label: 'Hồ sơ cá nhân', path: '/teacher/profile', icon: User },
    { label: 'Báo Cáo Lỗi', path: '/teacher/report', icon: Bug },
  ];

  const studentNavItems = [
    { label: 'Bàn học tập', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Lớp học', path: '/student/classrooms', icon: Users },
    { label: 'Bài thi khả dụng', path: '/student/quizzes', icon: FileQuestion },
    { label: 'Bài đã làm', path: '/student/history', icon: FileText },
    { label: 'Hồ sơ cá nhân', path: '/student/profile', icon: User },
    { label: 'Báo Cáo Lỗi', path: '/student/report', icon: Bug },
  ];

  const navItems = isTeacher ? teacherNavItems : studentNavItems;
  const layoutId = isTeacher ? 'teacher-sidebar-indicator' : 'student-sidebar-indicator';

  // Determine active path for layoutId matching
  const location = useLocation();
  const activePath = navItems.find(item => {
    const isDashboard = item.path === '/teacher/dashboard' || item.path === '/student/dashboard';
    return isDashboard ? location.pathname === item.path : location.pathname.startsWith(item.path);
  })?.path;

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed md:sticky top-0 md:top-[calc(4rem+env(safe-area-inset-top))] left-0 z-[100] md:z-30 h-[100dvh] md:h-[calc(100dvh-4rem-env(safe-area-inset-top))] w-[80vw] max-w-[320px] md:w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-white/50 dark:border-slate-800 rounded-r-[2rem] md:rounded-none transition-transform duration-300 ease-in-out flex flex-col justify-between p-5 md:p-4 pt-[max(2rem,env(safe-area-inset-top))] md:pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:pb-4 shadow-[20px_0_40px_rgba(0,0,0,0.1)] md:shadow-[4px_0_24px_rgba(0,0,0,0.05)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20 lg:w-64'
        }`}
      >
        <div>
          {/* Mobile close button */}
          <div className="flex items-center justify-between md:hidden mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Menu điều hướng
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/teacher/dashboard' || item.path === '/student/dashboard'}
                  onClick={() => {
                    if (window.innerWidth < 768) setSidebarOpen(false);
                  }}
                  className={`relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold group ${
                    isActive
                      ? 'text-sky-600 dark:text-sky-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {/* Sliding background pill — only rendered for active item */}
                  {isActive && (
                    <motion.span
                      layoutId={layoutId}
                      className="absolute inset-0 rounded-2xl bg-sky-50 dark:bg-sky-950/70 shadow-xs"
                      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
                    />
                  )}

                  {/* Icon with subtle scale on hover */}
                  <Icon className="relative z-10 w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-150" />

                  <span className="relative z-10 truncate md:hidden lg:inline">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom card preview */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/80 to-sky-50/80 dark:from-slate-800/80 dark:to-sky-950/30 border border-sky-100/60 dark:border-sky-900/40 md:hidden lg:block">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {isTeacher ? 'Chế độ Giáo Viên' : 'Chế độ Học Sinh'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {isTeacher
              ? 'Tạo đề thi, theo dõi điểm số và xuất bản bài kiểm tra dễ dàng.'
              : 'Tham gia làm bài thi trực tuyến với đồng hồ đếm ngược tự động.'}
          </p>
        </div>
      </aside>
    </>
  );
};
