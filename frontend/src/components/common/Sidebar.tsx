import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import {
  LayoutDashboard,
  Calendar,
  Users,
  BookOpen,
  ClipboardList,
  Award,
  FileText,
  FileQuestion,
  PlusCircle,
  DollarSign,
  Database,
  AlertCircle,
  User,
  Bug,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  type: 'item';
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  matchPrefixes?: string[];
}

interface NavGroup {
  type: 'group';
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  basePath: string;
  children: {
    label: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    end?: boolean;
  }[];
}

interface NavSection {
  title?: string;
  items: (NavItem | NavGroup)[];
}

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';

  // State for collapsible group "Bài thi & Kiểm tra"
  const isQuizRouteActive = location.pathname.startsWith('/teacher/quizzes');
  const [isQuizGroupOpen, setIsQuizGroupOpen] = useState(isQuizRouteActive);

  // Auto-expand quiz group if user navigates to a quiz route
  useEffect(() => {
    if (isQuizRouteActive) {
      setIsQuizGroupOpen(true);
    }
  }, [isQuizRouteActive]);

  // Handle responsive auto-collapse on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && isSidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, setSidebarOpen]);

  // ==================== TEACHER NAVIGATION STRUCTURE ====================
  const teacherSections: NavSection[] = [
    {
      // TOP LEVEL: Overview & Schedule
      items: [
        { type: 'item', label: 'Tổng Quan', path: '/teacher/dashboard', icon: LayoutDashboard, end: true },
        { type: 'item', label: 'Lịch Dạy', path: '/teacher/schedule', icon: Calendar },
      ],
    },
    {
      title: 'GIẢNG DẠY',
      items: [
        { type: 'item', label: 'Học Sinh', path: '/teacher/students', icon: Users },
        {
          type: 'item',
          label: 'Khóa Học',
          path: '/teacher/classes',
          icon: BookOpen,
          matchPrefixes: ['/teacher/classes', '/teacher/classrooms'],
        },
        { type: 'item', label: 'Nhật Ký Học Tập', path: '/teacher/learning-logs', icon: ClipboardList },
        { type: 'item', label: 'Điểm Số', path: '/teacher/scores', icon: Award },
      ],
    },
    {
      title: 'KIỂM TRA',
      items: [
        {
          type: 'group',
          id: 'quizzes-group',
          label: 'Bài thi & Kiểm tra',
          icon: FileQuestion,
          basePath: '/teacher/quizzes',
          children: [
            { label: 'Danh sách bài thi', path: '/teacher/quizzes', icon: FileText, end: true },
            { label: 'Tạo bài thi mới', path: '/teacher/quizzes/create', icon: PlusCircle },
          ],
        },
      ],
    },
    {
      title: 'TÀI CHÍNH',
      items: [
        { type: 'item', label: 'Học Phí', path: '/teacher/tuition', icon: DollarSign },
      ],
    },
    {
      title: 'CÔNG CỤ',
      items: [
        { type: 'item', label: 'Ngân hàng đề', path: '/teacher/bank', icon: Database },
        { type: 'item', label: 'Phúc Khảo', path: '/teacher/appeals', icon: AlertCircle },
      ],
    },
  ];

  const teacherFooterItems: NavItem[] = [
    { type: 'item', label: 'Hồ sơ cá nhân', path: '/teacher/profile', icon: User },
    { type: 'item', label: 'Báo Cáo Lỗi', path: '/teacher/report', icon: Bug },
  ];

  // ==================== STUDENT NAVIGATION STRUCTURE ====================
  const studentSections: NavSection[] = [
    {
      items: [
        { type: 'item', label: 'Bàn học tập', path: '/student/dashboard', icon: LayoutDashboard, end: true },
        { type: 'item', label: 'Lớp học', path: '/student/classrooms', icon: Users },
      ],
    },
    {
      title: 'HỌC TẬP & THI',
      items: [
        { type: 'item', label: 'Bài thi khả dụng', path: '/student/quizzes', icon: FileQuestion },
        { type: 'item', label: 'Bài đã làm', path: '/student/history', icon: FileText },
      ],
    },
  ];

  const studentFooterItems: NavItem[] = [
    { type: 'item', label: 'Hồ sơ cá nhân', path: '/student/profile', icon: User },
    { type: 'item', label: 'Báo Cáo Lỗi', path: '/student/report', icon: Bug },
  ];

  const activeSections = isTeacher ? teacherSections : studentSections;
  const activeFooterItems = isTeacher ? teacherFooterItems : studentFooterItems;

  const isItemActive = (item: NavItem) => {
    if (item.end) return location.pathname === item.path;
    if (item.matchPrefixes) {
      return item.matchPrefixes.some((p) => location.pathname.startsWith(p));
    }
    return location.pathname.startsWith(item.path);
  };

  const handleItemClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[90] bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed md:relative top-0 left-0 z-[100] md:z-10 h-[100dvh] md:h-full shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between ${
          isSidebarOpen
            ? 'w-[80vw] max-w-[300px] md:w-64 p-3.5 sm:p-4 shadow-xl md:shadow-none'
            : '-translate-x-full md:translate-x-0 md:w-20 p-2.5 sm:p-3'
        }`}
      >
        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 -mr-1 space-y-4">
          {/* Mobile close button */}
          <div className="flex items-center justify-between md:hidden mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
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

          {/* Navigation Sections */}
          {activeSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {/* Section Header */}
              {section.title && (
                isSidebarOpen ? (
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 select-none">
                    {section.title}
                  </div>
                ) : (
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2 mx-2" />
                )
              )}

              {/* Section Items */}
              {section.items.map((entry) => {
                // CASE 1: Standard Nav Item
                if (entry.type === 'item') {
                  const Icon = entry.icon;
                  const active = isItemActive(entry);

                  return (
                    <NavLink
                      key={entry.path}
                      to={entry.path}
                      end={entry.end}
                      onClick={handleItemClick}
                      title={!isSidebarOpen ? entry.label : undefined}
                      className={`relative flex items-center ${
                        isSidebarOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
                      } rounded-xl text-sm font-medium transition-colors ${
                        active
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {isSidebarOpen && <span className="truncate">{entry.label}</span>}
                    </NavLink>
                  );
                }

                // CASE 2: Expandable Nav Group (Bài thi & Kiểm tra)
                if (entry.type === 'group') {
                  const GroupIcon = entry.icon;
                  const groupActive = location.pathname.startsWith(entry.basePath);

                  return (
                    <div key={entry.id} className="space-y-1">
                      {/* Group Header Button */}
                      <button
                        onClick={() => {
                          if (!isSidebarOpen) {
                            navigate(entry.basePath);
                          } else {
                            setIsQuizGroupOpen((prev) => !prev);
                          }
                        }}
                        title={!isSidebarOpen ? entry.label : undefined}
                        className={`w-full relative flex items-center justify-between ${
                          isSidebarOpen ? 'px-3.5 py-2.5' : 'justify-center p-2.5'
                        } rounded-xl text-sm font-medium transition-colors ${
                          groupActive
                            ? 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <GroupIcon className="w-5 h-5 flex-shrink-0" />
                          {isSidebarOpen && <span className="truncate">{entry.label}</span>}
                        </div>
                        {isSidebarOpen && (
                          <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                              isQuizGroupOpen ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>

                      {/* Submenu Children */}
                      <AnimatePresence initial={false}>
                        {isQuizGroupOpen && isSidebarOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: 'easeInOut' }}
                            className="overflow-hidden ml-4 pl-3 border-l-2 border-slate-100 dark:border-slate-800 space-y-0.5 mt-1"
                          >
                            {entry.children.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = sub.end
                                ? location.pathname === sub.path
                                : location.pathname.startsWith(sub.path);

                              return (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  end={sub.end}
                                  onClick={handleItemClick}
                                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                    subActive
                                      ? 'bg-sky-100/70 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold'
                                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  <span className="truncate">{sub.label}</span>
                                </NavLink>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          ))}
        </div>

        {/* Footer Area: Profile & Bug Report (Clean, No Promotional Cards) */}
        <div className="shrink-0 pt-3 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-1">
          {activeFooterItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleItemClick}
                title={!isSidebarOpen ? item.label : undefined}
                className={`relative flex items-center ${
                  isSidebarOpen ? 'gap-3 px-3.5 py-2.5' : 'justify-center p-2.5'
                } rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
};
