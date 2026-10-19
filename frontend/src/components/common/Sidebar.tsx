import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/auth.store';
import { useUiStore } from '../../stores/ui.store';
import { Logo } from './Logo';
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
    matchPrefixes?: string[];
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

  // Tooltip state for collapsed sidebar mode
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);

  // Auto-expand quiz group if user navigates to a quiz route
  useEffect(() => {
    if (isQuizRouteActive) {
      setIsQuizGroupOpen(true);
    }
  }, [isQuizRouteActive]);

  // Clear tooltip when sidebar state changes
  useEffect(() => {
    setHoveredTooltip(null);
  }, [isSidebarOpen]);

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
            { label: 'Bài thi', path: '/teacher/quizzes', icon: FileText, end: true },
            { label: 'Tạo bài thi', path: '/teacher/quizzes/create', icon: PlusCircle },
            { label: 'Ngân hàng đề', path: '/teacher/bank', icon: Database },
            { label: 'Kết quả ôn tập', path: '/teacher/scores', icon: Award },
            { label: 'Phúc khảo', path: '/teacher/appeals', icon: AlertCircle },
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
    { type: 'item', label: 'Báo lỗi', path: '/teacher/report', icon: Bug },
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
    { type: 'item', label: 'Báo lỗi', path: '/student/report', icon: Bug },
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
    setHoveredTooltip(null);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleMouseEnter = (label: string, e: React.MouseEvent<HTMLElement>) => {
    if (!isSidebarOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({
        label,
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
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
            ? 'w-[80vw] max-w-[280px] md:w-64 p-3 shadow-xl md:shadow-none'
            : '-translate-x-full md:translate-x-0 md:w-20 p-2'
        }`}
      >
        {/* Navigation Scroll Area */}
        <div
          onScroll={handleMouseLeave}
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-1 -mr-1 space-y-2.5"
        >
          {/* Mobile close button with Brand Logo */}
          <div className="flex items-center justify-between md:hidden mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6 shrink-0" alt="QuizMaster" />
              <span className="text-xs font-bold text-slate-800 dark:text-white">
                QuizMaster
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Sections */}
          {activeSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-0.5">
              {/* Section Header */}
              {section.title && (
                isSidebarOpen ? (
                  <div className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-2 pb-0.5 select-none">
                    {section.title}
                  </div>
                ) : (
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5 mx-2" />
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
                      key={entry.path + entry.label}
                      to={entry.path}
                      end={entry.end}
                      onClick={handleItemClick}
                      onMouseEnter={(e) => handleMouseEnter(entry.label, e)}
                      onMouseLeave={handleMouseLeave}
                      className={`relative flex items-center ${
                        isSidebarOpen ? 'gap-2.5 px-3 py-2' : 'justify-center p-2'
                      } rounded-xl text-xs sm:text-[13px] font-medium transition-colors ${
                        active
                          ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                      {isSidebarOpen && <span className="truncate">{entry.label}</span>}
                    </NavLink>
                  );
                }

                // CASE 2: Expandable Nav Group (Bài thi & Kiểm tra)
                if (entry.type === 'group') {
                  const GroupIcon = entry.icon;
                  const groupActive = location.pathname.startsWith(entry.basePath);

                  return (
                    <div key={entry.id} className="space-y-0.5">
                      {/* Group Header Button */}
                      <button
                        onClick={() => {
                          if (!isSidebarOpen) {
                            navigate(entry.basePath);
                          } else {
                            setIsQuizGroupOpen((prev) => !prev);
                          }
                        }}
                        onMouseEnter={(e) => handleMouseEnter(entry.label, e)}
                        onMouseLeave={handleMouseLeave}
                        className={`w-full relative flex items-center ${
                          isSidebarOpen ? 'justify-between px-3 py-2' : 'justify-center p-2'
                        } rounded-xl text-xs sm:text-[13px] font-medium transition-colors ${
                          groupActive
                            ? 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {isSidebarOpen ? (
                          <>
                            <div className="flex items-center gap-2.5 truncate">
                              <GroupIcon className="w-4.5 h-4.5 flex-shrink-0" />
                              <span className="truncate">{entry.label}</span>
                            </div>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                isQuizGroupOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </>
                        ) : (
                          <GroupIcon className="w-4.5 h-4.5 flex-shrink-0" />
                        )}
                      </button>

                      {/* Submenu Children */}
                      <AnimatePresence initial={false}>
                        {isQuizGroupOpen && isSidebarOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.16, ease: 'easeInOut' }}
                            className="overflow-hidden ml-3.5 pl-2.5 border-l-2 border-slate-100 dark:border-slate-800 space-y-0.5 mt-0.5"
                          >
                            {entry.children.map((sub) => {
                              const SubIcon = sub.icon;
                              const subActive = sub.end
                                ? location.pathname === sub.path
                                : location.pathname.startsWith(sub.path);

                              return (
                                <NavLink
                                  key={sub.path + sub.label}
                                  to={sub.path}
                                  end={sub.end}
                                  onClick={handleItemClick}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

        {/* Footer Area: Profile & Bug Report (Separated with clean border-top) */}
        <div className="shrink-0 pt-2.5 mt-auto border-t border-slate-200/80 dark:border-slate-800 space-y-0.5">
          {activeFooterItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleItemClick}
                onMouseEnter={(e) => handleMouseEnter(item.label, e)}
                onMouseLeave={handleMouseLeave}
                className={`relative flex items-center ${
                  isSidebarOpen ? 'gap-2.5 px-3 py-2' : 'justify-center p-2'
                } rounded-xl text-xs sm:text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </div>
      </aside>

      {/* Floating Tooltip for Collapsed Sidebar (Fixed position to prevent any clipping/shift) */}
      {!isSidebarOpen && hoveredTooltip && (
        <div
          style={{
            position: 'fixed',
            top: hoveredTooltip.top,
            left: hoveredTooltip.left,
            transform: 'translateY(-50%)',
          }}
          className="z-[999] pointer-events-none flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900/95 dark:bg-slate-800 dark:text-slate-100 shadow-xl border border-slate-700/80 whitespace-nowrap animate-in fade-in duration-150"
          role="tooltip"
        >
          {/* Subtle arrow pointing left */}
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-900/95 dark:bg-slate-800 border-l border-b border-slate-700/80" />
          <span className="relative z-10">{hoveredTooltip.label}</span>
        </div>
      )}
    </>
  );
};
