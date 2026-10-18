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
  Calendar,
  DollarSign,
  Award,
  ClipboardList,
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
    { label: 'Lịch Dạy', path: '/teacher/schedule', icon: Calendar },
    { label: 'Nhật Ký Học Tập', path: '/teacher/learning-logs', icon: ClipboardList },
    { label: 'Học Phí', path: '/teacher/tuition', icon: DollarSign },
    { label: 'Điểm Số', path: '/teacher/scores', icon: Award },
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
    if (isDashboard) return location.pathname === item.path;
    if (item.path === '/teacher/classrooms' && (location.pathname.startsWith('/teacher/classrooms') || location.pathname.startsWith('/teacher/classes'))) {
      return true;
    }
    return location.pathname.startsWith(item.path);
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
        className={`fixed md:relative top-0 left-0 z-[100] md:z-10 h-[100dvh] md:h-full w-[80vw] max-w-[320px] md:w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between p-4 shadow-xl md:shadow-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 -mr-1 space-y-1">
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

                  <span className="relative z-10 truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom card preview */}
        <div className="shrink-0 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50/80 to-sky-50/80 dark:from-slate-800/80 dark:to-sky-950/30 border border-sky-100/60 dark:border-sky-900/40">
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
        </div>
      </aside>
    </>
  );
};
