import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardService } from '../../services/dashboard.service';
import { StatCard } from '../../components/common/StatCard';
import { TeacherCharts, ScoreDistributionItem } from '../../components/teacher/TeacherCharts';
import { Badge } from '../../components/common/Badge';
import { useAuthStore } from '../../stores/auth.store';
import {
  FileQuestion,
  CheckCircle,
  Users,
  Award,
  Plus,
  ArrowRight,
  Sparkles,
  Trash2,
  Filter,
  X,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Modal } from '../../components/common/Modal';
import { quizService } from '../../services/quiz.service';
import { useUiStore } from '../../stores/ui.store';

export const TeacherDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useUiStore();

  // Filters from URL query params
  const periodDays = Number(searchParams.get('period') || 7);
  const selectedSubject = searchParams.get('subject') || '';
  const selectedQuizId = searchParams.get('quizId') || '';
  const selectedStatus = searchParams.get('status') || '';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);

  // Submissions Modal State
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [submissionsFilter, setSubmissionsFilter] = useState<{
    scoreMin?: number;
    scoreMax?: number;
    scoreLabel?: string;
    date?: string;
    quizId?: string;
    studentId?: string;
    studentName?: string;
  }>({});
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsSearch, setSubmissionsSearch] = useState('');

  // Students Modal State
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsSearch, setStudentsSearch] = useState('');

  // Update URL filter
  const updateFilter = (key: string, value: string | number) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!value || value === 'all' || value === 0) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, String(value));
    }
    setSearchParams(nextParams);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchParams.get('period') ||
    selectedSubject ||
    selectedQuizId ||
    selectedStatus
  );

  // Fetch Dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getTeacherDashboard({
        periodDays,
        subject: selectedSubject || undefined,
        quizId: selectedQuizId || undefined,
        status: selectedStatus || undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Error fetching teacher dashboard:', err);
      addToast({ type: 'error', title: 'Không thể tải số liệu bảng điều khiển' });
    } finally {
      setLoading(false);
    }
  }, [periodDays, selectedSubject, selectedQuizId, selectedStatus, addToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Load Submissions in Modal
  const loadSubmissions = useCallback(async (page = 1, search = submissionsSearch) => {
    setSubmissionsLoading(true);
    try {
      const res = await dashboardService.getTeacherSubmissions({
        page,
        limit: 10,
        scoreMin: submissionsFilter.scoreMin,
        scoreMax: submissionsFilter.scoreMax,
        date: submissionsFilter.date,
        quizId: submissionsFilter.quizId || selectedQuizId || undefined,
        studentId: submissionsFilter.studentId,
        search: search.trim() || undefined,
      });
      setSubmissionsList(res.items || []);
      setSubmissionsTotal(res.total || 0);
      setSubmissionsPage(page);
    } catch {
      addToast({ type: 'error', title: 'Lỗi tải danh sách bài nộp' });
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionsFilter, selectedQuizId, submissionsSearch, addToast]);

  useEffect(() => {
    if (showSubmissionsModal) {
      loadSubmissions(1, submissionsSearch);
    }
  }, [showSubmissionsModal, submissionsFilter, loadSubmissions, submissionsSearch]);

  // Load Students in Modal
  const loadStudents = useCallback(async (page = 1, search = studentsSearch) => {
    setStudentsLoading(true);
    try {
      const res = await dashboardService.getTeacherStudents({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setStudentsList(res.items || []);
      setStudentsTotal(res.total || 0);
      setStudentsPage(page);
    } catch {
      addToast({ type: 'error', title: 'Lỗi tải danh sách học sinh' });
    } finally {
      setStudentsLoading(false);
    }
  }, [studentsSearch, addToast]);

  useEffect(() => {
    if (showStudentsModal) {
      loadStudents(1, studentsSearch);
    }
  }, [showStudentsModal, loadStudents, studentsSearch]);

  const handleDeleteQuiz = async () => {
    if (!deleteQuizId) return;
    try {
      await quizService.deleteQuiz(deleteQuizId);
      addToast({ type: 'success', title: 'Đã xóa bài thi thành công' });
      setDeleteQuizId(null);
      fetchDashboard();
    } catch {
      addToast({ type: 'error', title: 'Xóa bài thi thất bại' });
    }
  };

  const stats = data?.stats || {
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalStudents: 0,
    totalSubmissions: 0,
    averageScore: 0,
  };

  const charts = data?.charts || {
    scoreDistribution: [],
    activityTrend: [],
  };

  const filterOptions = data?.filterOptions || {
    subjects: [],
    quizzes: [],
  };

  const recentQuizzes = data?.recentQuizzes || [];

  const handleOpenScoreRange = (item: ScoreDistributionItem) => {
    setSubmissionsFilter({
      scoreMin: item.min,
      scoreMax: item.max,
      scoreLabel: item.range,
    });
    setSubmissionsSearch('');
    setShowSubmissionsModal(true);
  };

  const handleOpenDateTrend = (dateStr: string) => {
    setSubmissionsFilter({
      date: dateStr,
      scoreLabel: `Ngày ${dateStr}`,
    });
    setSubmissionsSearch('');
    setShowSubmissionsModal(true);
  };

  const handleOpenAllSubmissions = () => {
    setSubmissionsFilter({});
    setSubmissionsSearch('');
    setShowSubmissionsModal(true);
  };

  const handleOpenStudentSubmissions = (student: any) => {
    setShowStudentsModal(false);
    setSubmissionsFilter({
      studentId: student.id,
      studentName: student.name,
    });
    setSubmissionsSearch('');
    setShowSubmissionsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600 text-white shadow-lg shadow-sky-200/50 dark:shadow-none overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Giảng viên
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            Xin chào, {user?.name || 'Giáo Viên'}! 👋
          </h1>
          <p className="text-sky-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
            {stats.totalQuizzes > 0
              ? `Hệ thống hiện có ${stats.totalQuizzes} bài kiểm tra và ${stats.totalSubmissions} lượt nộp bài thi.`
              : 'Hệ thống hiện chưa có đề thi nào. Hãy bắt đầu bằng cách tạo bài kiểm tra đầu tiên!'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/teacher/quizzes/create"
              id="dashboard-create-quiz-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs shadow-sm transition-transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Tạo bài thi mới
            </Link>
            <Link
              to="/teacher/quizzes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-700/60 hover:bg-sky-700 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              Quản lý đề thi
            </Link>
            <Link
              to="/teacher/schedule"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Lịch dạy
            </Link>
            <Link
              to="/teacher/tuition"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              Học phí
            </Link>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Filter Bar */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-sm">
            <Filter className="w-4 h-4 text-sky-500" />
            <span>Bộ lọc tổng quan</span>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 font-semibold px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Period selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Khoảng thời gian
            </label>
            <select
              value={periodDays}
              onChange={(e) => updateFilter('period', Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value={7}>7 ngày gần nhất</option>
              <option value={30}>30 ngày gần nhất</option>
              <option value={90}>90 ngày gần nhất</option>
              <option value={0}>Tất cả thời gian</option>
            </select>
          </div>

          {/* Subject selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Môn học
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => updateFilter('subject', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Tất cả môn học</option>
              {filterOptions.subjects.map((sub: string) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Quiz selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3" /> Đề thi cụ thể
            </label>
            <select
              value={selectedQuizId}
              onChange={(e) => updateFilter('quizId', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Tất cả đề thi</option>
              {filterOptions.quizzes.map((q: any) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Trạng thái đề
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PUBLISHED">Đang mở (Published)</option>
              <option value="DRAFT">Bản thảo (Draft)</option>
              <option value="CLOSED">Đã đóng (Closed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats (Clickable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tổng bài kiểm tra"
          value={stats.totalQuizzes}
          subtitle="Bao gồm cả bản thảo"
          clickableHint="Xem danh sách"
          onClick={() => navigate('/teacher/quizzes')}
          icon={<FileQuestion className="w-5 h-5" />}
          variant="lavender"
          delay={0.05}
        />
        <StatCard
          title="Bài đang hoạt động"
          value={stats.activeQuizzes}
          subtitle="Học sinh có thể truy cập"
          clickableHint="Xem đề đang mở"
          onClick={() => navigate('/teacher/quizzes?status=PUBLISHED')}
          icon={<CheckCircle className="w-5 h-5" />}
          variant="mint"
          delay={0.1}
        />
        <StatCard
          title="Học sinh tham gia"
          value={stats.totalStudents}
          subtitle="Học sinh đã nộp bài"
          clickableHint="Bảng xếp hạng"
          onClick={() => setShowStudentsModal(true)}
          icon={<Users className="w-5 h-5" />}
          variant="sky"
          delay={0.15}
        />
        <StatCard
          title="Điểm trung bình"
          value={`${stats.averageScore.toFixed(2)}/10.00`}
          subtitle="Thang điểm chuẩn 10"
          clickableHint="Xem bài nộp"
          onClick={handleOpenAllSubmissions}
          icon={<Award className="w-5 h-5" />}
          variant="peach"
          delay={0.2}
        />
        <StatCard
          title="Tổng lượt nộp"
          value={stats.totalSubmissions}
          subtitle="Lượt nộp đã ghi nhận"
          clickableHint="Chi tiết bài làm"
          onClick={handleOpenAllSubmissions}
          icon={<Sparkles className="w-5 h-5" />}
          variant="rose"
          delay={0.25}
        />
      </div>

      {/* Analytics Charts */}
      {loading ? (
        <div className="h-64 flex items-center justify-center bg-white/50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
          <div className="w-6 h-6 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <TeacherCharts
          scoreDistribution={charts.scoreDistribution}
          activityTrend={charts.activityTrend}
          periodDays={periodDays}
          onPeriodChange={(days) => updateFilter('period', days)}
          onSelectScoreRange={handleOpenScoreRange}
          onSelectDate={handleOpenDateTrend}
        />
      )}

      {/* Recent Quizzes List */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Đề thi gần đây
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Danh sách các bài kiểm tra được tạo gần đây
            </p>
          </div>
          <Link
            to="/teacher/quizzes"
            className="flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentQuizzes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có bài thi nào trong hệ thống. Nhấn{' '}
            <Link
              to="/teacher/quizzes/create"
              className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              "Tạo bài thi mới"
            </Link>{' '}
            để bắt đầu soạn đề.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentQuizzes.map((quiz: any) => (
              <div
                key={quiz.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 px-3 rounded-2xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={quiz.status === 'PUBLISHED' ? 'mint' : 'slate'} size="sm">
                      {quiz.status === 'PUBLISHED' ? 'Đang mở' : 'Bản thảo'}
                    </Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      {quiz.subject}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                    {quiz.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{quiz.questionCount} câu hỏi</span>
                    <span>•</span>
                    <span>{quiz.durationMinutes} phút</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link
                    to={`/teacher/quizzes/${quiz.id}/results`}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Kết quả
                  </Link>
                  <Link
                    to={`/teacher/quizzes/${quiz.id}/edit`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 transition-colors"
                  >
                    Chỉnh sửa
                  </Link>
                  <button
                    onClick={() => setDeleteQuizId(quiz.id)}
                    className="p-1.5 rounded-xl text-rose-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Xóa bài thi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submissions Detail Modal */}
      <Modal
        isOpen={showSubmissionsModal}
        onClose={() => setShowSubmissionsModal(false)}
        maxWidth="4xl"
        title={
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Chi tiết lượt nộp bài</span>
              {submissionsFilter.scoreLabel && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {submissionsFilter.scoreLabel}
                </span>
              )}
              {submissionsFilter.studentName && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  Học sinh: {submissionsFilter.studentName}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng cộng {submissionsTotal} lượt nộp bài phù hợp
            </p>
          </div>
        }
        bodyClassName="p-0"
        footer={
          <div className="w-full flex items-center justify-between text-xs text-slate-500">
            <span>Trang {submissionsPage} / {Math.max(1, Math.ceil(submissionsTotal / 10))}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submissionsPage <= 1 || submissionsLoading}
                onClick={() => loadSubmissions(submissionsPage - 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={submissionsPage * 10 >= submissionsTotal || submissionsLoading}
                onClick={() => loadSubmissions(submissionsPage + 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col">
          {/* Search toolbar */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên hoặc email..."
                value={submissionsSearch}
                onChange={(e) => setSubmissionsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadSubmissions(1, submissionsSearch);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadSubmissions(1, submissionsSearch)}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors"
            >
              Tìm
            </button>
          </div>

          {/* List */}
          <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
            {submissionsLoading ? (
              <div className="py-16 text-center">
                <div className="w-7 h-7 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400">Đang tải danh sách...</span>
              </div>
            ) : submissionsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Không tìm thấy lượt nộp bài nào phù hợp điều kiện.
              </div>
            ) : (
              submissionsList.map((sub: any) => (
                <div
                  key={sub.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={sub.studentAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256'}
                      alt={sub.studentName}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {sub.studentName}
                      </div>
                      <div className="text-[11px] text-slate-400">{sub.studentEmail}</div>
                      <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                        Đề: {sub.quizTitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto text-xs">
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-sky-600 dark:text-sky-400">
                        {((Number(sub.percentage) || 0) / 10).toFixed(2)}/10.00
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Đúng {sub.correctCount} • Sai {sub.wrongCount}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 hidden md:block">
                      <div>{new Date(sub.createdAt).toLocaleDateString('vi-VN')}</div>
                      <div>{Math.round(sub.timeUsedSeconds / 60)} phút</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/teacher/quizzes/${sub.quizId}/grade/${sub.id}`}
                        className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 hover:bg-sky-100 transition-colors"
                      >
                        Chấm bài
                      </Link>
                      <Link
                        to={`/teacher/quizzes/${sub.quizId}/results`}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Xem kết quả đề"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Students Modal */}
      <Modal
        isOpen={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        maxWidth="3xl"
        title={
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
              Danh sách học sinh tham gia thi
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tổng cộng {studentsTotal} học sinh đã tham gia các bài kiểm tra của bạn
            </p>
          </div>
        }
        bodyClassName="p-0"
        footer={
          <div className="w-full flex items-center justify-between text-xs text-slate-500">
            <span>Trang {studentsPage} / {Math.max(1, Math.ceil(studentsTotal / 10))}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={studentsPage <= 1 || studentsLoading}
                onClick={() => loadStudents(studentsPage - 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={studentsPage * 10 >= studentsTotal || studentsLoading}
                onClick={() => loadStudents(studentsPage + 1)}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh theo tên hoặc email..."
                value={studentsSearch}
                onChange={(e) => setStudentsSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadStudents(1, studentsSearch);
                }}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadStudents(1, studentsSearch)}
              className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors"
            >
              Tìm
            </button>
          </div>

          {/* List */}
          <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
            {studentsLoading ? (
              <div className="py-16 text-center">
                <div className="w-7 h-7 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mx-auto mb-2" />
                <span className="text-xs text-slate-400">Đang tải danh sách học sinh...</span>
              </div>
            ) : studentsList.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Chưa có học sinh nào nộp bài kiểm tra.
              </div>
            ) : (
              studentsList.map((stu: any) => (
                <div
                  key={stu.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={stu.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256'}
                      alt={stu.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {stu.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{stu.email}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Đã làm {stu.submissionsCount} bài thi
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto text-xs">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400">Điểm TB: <span className="font-bold text-sky-600 dark:text-sky-400">{stu.averageScore}/10</span></div>
                      <div className="text-[11px] text-slate-400">Cao nhất: <span className="font-bold text-emerald-600 dark:text-emerald-400">{stu.highestScore}/10</span></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenStudentSubmissions(stu)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 hover:bg-sky-100 transition-colors"
                    >
                      Xem bài làm
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteQuizId}
        onClose={() => setDeleteQuizId(null)}
        onConfirm={handleDeleteQuiz}
        title="Xác nhận xóa bài kiểm tra"
        description="Bạn có chắc chắn muốn xóa bài kiểm tra này? Thao tác này sẽ xóa toàn bộ câu hỏi và kết quả bài nộp của học sinh."
        confirmText="Xóa vĩnh viễn"
        variant="danger"
      />
    </div>
  );
};
