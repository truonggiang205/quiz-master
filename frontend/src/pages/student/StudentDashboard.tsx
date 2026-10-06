import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboard.service';
import { StatCard } from '../../components/common/StatCard';
import { QuizCard } from '../../components/student/QuizCard';
import { useAuthStore } from '../../stores/auth.store';
import {
  FileQuestion,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Filter,
  X,
  Search,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const analyticsRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState<number>(0); // 0 = all
  const [searchTerm, setSearchTerm] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getStudentDashboard({
        subject: subjectFilter || undefined,
        periodDays: periodFilter || undefined,
        search: searchTerm.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching student dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, periodFilter, searchTerm]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const clearFilters = () => {
    setSubjectFilter('');
    setPeriodFilter(0);
    setSearchTerm('');
  };

  const hasActiveFilters = Boolean(subjectFilter || periodFilter || searchTerm);

  const stats = data?.stats || {
    availableCount: 0,
    completedCount: 0,
    totalQuizzes: 0,
    averageScore: null,
    highestScore: null,
  };

  const availableQuizzes = data?.availableQuizzes || [];
  const recentSubmissions = data?.recentSubmissions || [];
  const progressTrend = data?.progressTrend || [];
  const subjectPerformance = data?.subjectPerformance || [];
  const availableSubjects = data?.availableSubjects || [];

  const scrollToAnalytics = () => {
    analyticsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Student Welcome Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-500 via-purple-500 to-sky-400 text-white shadow-lg shadow-sky-200/50 dark:shadow-none overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Học tập chủ động
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            Chào mừng, {user?.name || 'Học Sinh'}! 🎓
          </h1>
          <p className="text-sky-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Bạn có <span className="font-bold underline">{stats.availableCount} bài kiểm tra</span> đang sẵn sàng để thử sức. Hãy chọn một bài và bắt đầu nhé!
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/student/quizzes"
              id="student-dashboard-quizzes-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs shadow-sm transition-transform hover:scale-105"
            >
              <span>Xem tất cả bài thi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/student/history"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              Lịch sử làm bài
            </Link>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-sky-500" />
            <span>Bộ lọc kết quả</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-semibold px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm bài thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Tất cả môn học</option>
              {availableSubjects.map((sub: string) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value={0}>Tất cả thời gian</option>
              <option value={7}>7 ngày gần nhất</option>
              <option value={30}>30 ngày gần nhất</option>
              <option value={90}>90 ngày gần nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Stats (Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Bài thi khả dụng"
          value={stats.availableCount}
          subtitle={`Trên tổng số ${stats.totalQuizzes || stats.availableCount} bài`}
          clickableHint="Vào làm bài"
          onClick={() => navigate('/student/quizzes')}
          icon={<FileQuestion className="w-5 h-5" />}
          variant="lavender"
          delay={0.05}
        />
        <StatCard
          title="Bài đã hoàn thành"
          value={stats.completedCount}
          subtitle="Tổng số bài đã nộp"
          clickableHint="Xem lịch sử"
          onClick={() => navigate('/student/history')}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="mint"
          delay={0.1}
        />
        <StatCard
          title="Điểm trung bình"
          value={stats.averageScore !== null ? `${stats.averageScore.toFixed(2)}/10.00` : '—'}
          subtitle="Thang điểm chuẩn 10"
          clickableHint="Xem phân tích"
          onClick={scrollToAnalytics}
          icon={<Award className="w-5 h-5" />}
          variant="peach"
          delay={0.15}
        />
        <StatCard
          title="Điểm cao nhất"
          value={stats.highestScore !== null ? `${stats.highestScore.toFixed(2)}/10.00` : '—'}
          subtitle="Điểm kỷ lục đạt được"
          clickableHint="Xem phân tích"
          onClick={scrollToAnalytics}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="sky"
          delay={0.2}
        />
      </div>

      {/* Analytics Section: Progress Trend & Subject Breakdown */}
      <div ref={analyticsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Progress Trend Chart */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm min-w-0 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              <span>Tiến bộ điểm theo thời gian</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Điểm số các bài thi theo thứ tự thời gian nộp bài
            </p>
          </div>

          <div className="h-60 w-full min-w-0">
            {progressTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu bài nộp để hiển thị biểu đồ tiến bộ.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={progressTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis
                    dataKey="quizTitle"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => (val && val.length > 10 ? `${val.slice(0, 10)}...` : val)}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <div className="font-bold text-slate-800 dark:text-white mb-1">
                              {d.quizTitle}
                            </div>
                            <div className="text-sky-600 dark:text-sky-400 font-bold">
                              Điểm: {d.score}/10.00
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {new Date(d.submittedAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="linear"
                    dataKey="score"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#0284c7', strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#0284c7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-500" />
              <span>Điểm trung bình theo môn học</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Đánh giá năng lực theo từng lĩnh vực môn học
            </p>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {subjectPerformance.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có dữ liệu bài nộp theo môn học.
              </div>
            ) : (
              subjectPerformance.map((item: any) => (
                <div
                  key={item.subject}
                  className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/60"
                >
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800 dark:text-white">{item.subject}</span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                      {item.avgScore}/10.00 ({item.count} bài)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, item.avgScore * 10))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Available Quizzes Grid */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Bài thi đang mở
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Chọn một bài kiểm tra để bắt đầu thử sức
            </p>
          </div>
          <Link
            to="/student/quizzes"
            className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {availableQuizzes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            Hiện tại không có bài kiểm tra nào phù hợp điều kiện lọc.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableQuizzes.map((quiz: any) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Submissions History */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Lịch sử làm bài gần đây
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xem lại kết quả thi và đáp án bài làm của bạn
            </p>
          </div>
          <Link
            to="/student/history"
            className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {recentSubmissions.map((sub: any) => (
            <div
              key={sub.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 px-3 rounded-2xl transition-colors"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                  {sub.quizTitle}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>Nộp lúc: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : 'Mới đây'}</span>
                  <span>•</span>
                  <span>{sub.correctCount} câu đúng</span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-base font-bold text-sky-600 dark:text-sky-400">
                    {((Number(sub.percentage) || 0) / 10).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-normal"> / 10.00</span>
                </div>

                <Link
                  to={`/student/quizzes/${sub.quizId}/result?submissionId=${sub.id}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition-colors"
                >
                  Xem đáp án
                </Link>
              </div>
            </div>
          ))}

          {recentSubmissions.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400">
              Bạn chưa hoàn thành bài kiểm tra nào.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
