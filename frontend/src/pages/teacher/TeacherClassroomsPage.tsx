import React, { useState, useEffect, useMemo } from 'react';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom } from '../../types/classroom';
import {
  PlusCircle,
  Users,
  Copy,
  Check,
  BookOpen,
  User,
  X,
  GraduationCap,
  ChevronRight,
  Search,
  Award,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Layers,
} from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { useAuthStore } from '../../stores/auth.store';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

type FilterTab = 'all' | 'class' | 'private';

const tabConfig: { value: FilterTab; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'Tất cả', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'class', label: 'Lớp học nhóm', icon: <Users className="w-4 h-4" /> },
  { value: 'private', label: 'Kèm 1-1', icon: <User className="w-4 h-4" /> },
];

const SCORE_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981'];

export const TeacherClassroomsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    isPrivate: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const data = await ClassroomService.getTeacherClasses();
      setClassrooms(data);
    } catch {
      addToast({ type: 'error', title: 'Không thể tải danh sách lớp học' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ClassroomService.createClass(
        formData.name,
        formData.description,
        formData.subject,
        formData.isPrivate
      );
      addToast({
        type: 'success',
        title: formData.isPrivate ? 'Đã tạo lớp kèm 1-1!' : 'Đã tạo lớp học nhóm!',
      });
      setShowCreateModal(false);
      setFormData({ name: '', description: '', subject: '', isPrivate: false });
      fetchClassrooms();
    } catch {
      addToast({ type: 'error', title: 'Không thể tạo lớp học' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({ type: 'info', title: `Đã sao chép mã: ${code}` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((c) => {
      if (activeTab === 'class' && c.isPrivate) return false;
      if (activeTab === 'private' && !c.isPrivate) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(query);
        const matchSubject = c.subject?.toLowerCase().includes(query);
        const matchCode = c.inviteCode?.toLowerCase().includes(query);
        return matchName || matchSubject || matchCode;
      }
      return true;
    });
  }, [classrooms, activeTab, searchQuery]);

  // Overall KPI computations from real data
  const overallStats = useMemo(() => {
    const totalClasses = classrooms.length;
    let totalStudents = 0;
    let totalQuizzes = 0;
    let scoreSum = 0;
    let scoreCount = 0;
    let completionSum = 0;

    classrooms.forEach((c) => {
      const students = c.stats?.totalStudents ?? c.students?.length ?? 0;
      totalStudents += students;
      const quizzes = c.stats?.quizCount ?? 0;
      totalQuizzes += quizzes;
      if (c.stats?.avgScore && c.stats.avgScore > 0) {
        scoreSum += c.stats.avgScore;
        scoreCount += 1;
      }
      if (c.stats?.completionRate !== undefined) {
        completionSum += c.stats.completionRate;
      }
    });

    const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '-';
    const avgCompletion =
      totalClasses > 0 ? Math.round(completionSum / totalClasses) : 0;

    return {
      totalClasses,
      totalStudents,
      totalQuizzes,
      avgScore,
      avgCompletion,
    };
  }, [classrooms]);

  const groupCount = classrooms.filter((c) => !c.isPrivate).length;
  const privateCount = classrooms.filter((c) => c.isPrivate).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-sky-600" />
            Khóa Học của tôi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý lớp học, sĩ số học sinh, biểu đồ kết quả và tiến độ học tập
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl transition-all font-semibold shadow-md shadow-sky-500/20 hover:shadow-sky-500/30 text-sm active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          Tạo mới
        </button>
      </div>

      {/* Top KPI Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng số lớp</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {overallStats.totalClasses}
              </span>
              <span className="text-[11px] text-slate-400">
                ({groupCount} nhóm / {privateCount} 1-1)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng học sinh</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {overallStats.totalStudents}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">học sinh</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Điểm TB chung</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {overallStats.avgScore}
              </span>
              <span className="text-[11px] text-slate-400">/ 10</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tỷ lệ nộp bài</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {overallStats.avgCompletion}%
              </span>
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">hoàn thành</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Tabs Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
        <div className="flex flex-wrap gap-2">
          {tabConfig.map((tab) => {
            const count =
              tab.value === 'all'
                ? classrooms.length
                : tab.value === 'class'
                ? groupCount
                : privateCount;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-sky-300'
                }`}
              >
                {tab.icon}
                {tab.label}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên lớp, môn, mã mời..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-sky-600" />
          <span className="text-sm text-slate-400">Đang tải danh sách lớp học...</span>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-14 text-center border border-slate-100 dark:border-slate-800"
        >
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {activeTab === 'private' ? (
              <User className="w-8 h-8 text-amber-500" />
            ) : (
              <Users className="w-8 h-8 text-sky-500" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            {searchQuery
              ? 'Không tìm thấy lớp học phù hợp'
              : activeTab === 'private'
              ? 'Chưa có lớp kèm 1-1'
              : 'Chưa có lớp học nào'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
            {searchQuery
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc xóa bộ lọc để tìm lại.'
              : activeTab === 'private'
              ? 'Tạo lớp kèm 1-1 để dạy riêng cho từng học sinh với chương trình cá nhân hóa.'
              : 'Tạo lớp học nhóm để mời nhiều học sinh tham gia và quản lý điểm số cùng một lúc.'}
          </p>
          <button
            onClick={() => {
              if (searchQuery) {
                setSearchQuery('');
              } else {
                setFormData((f) => ({ ...f, isPrivate: activeTab === 'private' }));
                setShowCreateModal(true);
              }
            }}
            className="inline-flex items-center gap-2 bg-sky-600 text-white hover:bg-sky-700 px-5 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow-md shadow-sky-500/20"
          >
            {searchQuery ? (
              'Xóa tìm kiếm'
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                Tạo lớp ngay
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence mode="popLayout">
            {filteredClassrooms.map((cls) => {
              const studentCount =
                cls.stats?.totalStudents ?? cls.students?.length ?? 0;
              const quizCount = cls.stats?.quizCount ?? 0;
              const avgScore =
                cls.stats?.avgScore && cls.stats.avgScore > 0
                  ? cls.stats.avgScore.toFixed(1)
                  : '-';
              const completionRate = cls.stats?.completionRate ?? 0;

              // Format chart data for mini chart
              const chartData = cls.stats?.scoreDistribution ?? [];
              const hasChartData = chartData.some((d) => d.count > 0);

              return (
                <motion.div
                  key={cls.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Card Banner */}
                    <div
                      className={`h-24 relative overflow-hidden p-4 flex flex-col justify-between ${
                        cls.isPrivate
                          ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
                          : 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600'
                      }`}
                    >
                      <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
                        {cls.isPrivate ? (
                          <User className="w-32 h-32 text-white -mr-6 -mt-6" />
                        ) : (
                          <BookOpen className="w-32 h-32 text-white -mr-6 -mt-6" />
                        )}
                      </div>

                      {/* Top banner tag row */}
                      <div className="flex items-center justify-between relative z-10">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-400/90 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Hoạt động
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                            cls.isPrivate
                              ? 'bg-white/25 text-white border border-white/30'
                              : 'bg-white/20 text-white border border-white/25'
                          }`}
                        >
                          {cls.isPrivate ? (
                            <>
                              <User className="w-3 h-3" /> Kèm 1-1
                            </>
                          ) : (
                            <>
                              <Users className="w-3 h-3" /> Lớp nhóm
                            </>
                          )}
                        </span>
                      </div>

                      {/* Class Title & Subject */}
                      <div className="relative z-10">
                        <h3 className="text-lg font-black text-white truncate leading-tight drop-shadow-xs">
                          {cls.name}
                        </h3>
                        <p className="text-xs text-white/85 truncate font-medium">
                          {cls.subject || 'Chưa phân môn'} &bull; GV:{' '}
                          {cls.teacher?.name || user?.name || 'Phụ trách'}
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3.5">
                      {/* Invite Code & Description */}
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <GraduationCap className="w-4 h-4 text-sky-500" />
                          {cls.isPrivate ? 'Kèm 1-1' : `${studentCount} học sinh`}
                        </span>

                        {!cls.isPrivate && cls.inviteCode && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Mã:</span>
                            <code className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/40">
                              {cls.inviteCode}
                            </code>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleCopyCode(cls.inviteCode);
                              }}
                              className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors p-1"
                              title="Sao chép mã lớp"
                            >
                              {copiedCode === cls.inviteCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {cls.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                          {cls.description}
                        </p>
                      )}

                      {/* Metrics 3-column Box */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Bài thi
                          </p>
                          <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">
                            {quizCount}
                          </p>
                        </div>
                        <div className="border-x border-slate-200 dark:border-slate-700">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Điểm TB
                          </p>
                          <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                            {avgScore}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Nộp bài
                          </p>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {completionRate}%
                          </p>
                        </div>
                      </div>

                      {/* Mini visual chart */}
                      <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-2 border border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 px-1">
                          <span className="flex items-center gap-1">
                            <BarChart2 className="w-3 h-3 text-sky-500" />
                            Phân bố điểm
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {hasChartData ? 'Theo thang điểm 10' : 'Chưa có bài thi'}
                          </span>
                        </div>

                        {hasChartData ? (
                          <div className="h-14 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData}
                                margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
                              >
                                <XAxis
                                  dataKey="label"
                                  tickLine={false}
                                  axisLine={false}
                                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                                />
                                <Tooltip
                                  cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }}
                                  contentStyle={{
                                    fontSize: '11px',
                                    borderRadius: '8px',
                                    padding: '4px 8px',
                                  }}
                                  formatter={(val) => [`${val} lượt`, 'Số lượng']}
                                />
                                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                  {chartData.map((_, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={SCORE_COLORS[index % SCORE_COLORS.length]}
                                    />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-10 flex items-center justify-center text-[11px] text-slate-400">
                            Chưa có dữ liệu kiểm tra
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 pt-0">
                    <Link
                      to={`/teacher/classrooms/${cls.id}`}
                      className="flex items-center justify-between w-full py-2.5 px-4 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-100 dark:border-sky-900/50 text-sky-700 dark:text-sky-300 rounded-xl text-sm font-bold transition-all group active:scale-98"
                    >
                      <span>Xem lớp &bull; Quản lý lớp</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white">
                  Tạo khóa học mới
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                    Loại lớp học
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, isPrivate: false }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        !formData.isPrivate
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-300'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          !formData.isPrivate
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Lớp nhóm</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                          Nhiều học sinh
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, isPrivate: true }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center ${
                        formData.isPrivate
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-amber-300'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          formData.isPrivate
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Kèm 1-1</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                          Dạy riêng cá nhân
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tên lớp học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={
                      formData.isPrivate
                        ? 'VD: Kèm Toán - Bé An'
                        : 'VD: Lớp 10A1 - Toán nâng cao'
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Môn học
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="VD: Toán học, Tiếng Anh..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mô tả (Tùy chọn)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Mô tả ngắn về lớp học này..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors text-sm"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-2.5 px-4 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm shadow-md ${
                      formData.isPrivate
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none'
                        : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200 dark:shadow-none'
                    }`}
                  >
                    {isSubmitting
                      ? 'Đang tạo...'
                      : formData.isPrivate
                      ? 'Tạo lớp kèm 1-1'
                      : 'Tạo lớp nhóm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
