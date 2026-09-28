import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../../services/dashboard.service';
import { StatCard } from '../../components/common/StatCard';
import { TeacherCharts } from '../../components/teacher/TeacherCharts';
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
} from 'lucide-react';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { quizService } from '../../services/quiz.service';
import { useUiStore } from '../../stores/ui.store';

export const TeacherDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteQuizId, setDeleteQuizId] = useState<string | null>(null);
  const { addToast } = useUiStore();

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await dashboardService.getTeacherDashboard();
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error fetching teacher dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteQuiz = async () => {
    if (!deleteQuizId) return;
    try {
      await quizService.deleteQuiz(deleteQuizId);
      addToast({ type: 'success', title: 'Đã xóa bài thi thành công' });
      setDeleteQuizId(null);
      // Reload dashboard
      const res = await dashboardService.getTeacherDashboard();
      setData(res);
    } catch {
      addToast({ type: 'error', title: 'Xóa bài thi thất bại' });
    }
  };

  const { user } = useAuthStore();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải số liệu bảng điều khiển...</span>
        </div>
      </div>
    );
  }

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

  const recentQuizzes = data?.recentQuizzes || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-200/50 dark:shadow-none overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Giảng viên
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            Xin chào, {user?.name || 'Giáo Viên'}! 👋
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
            {stats.totalQuizzes > 0
              ? `Hệ thống hiện có ${stats.totalQuizzes} bài kiểm tra và ${stats.totalSubmissions} lượt nộp bài thi.`
              : 'Hệ thống hiện chưa có đề thi nào. Hãy bắt đầu bằng cách tạo bài kiểm tra đầu tiên!'}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/teacher/quizzes/create"
              id="dashboard-create-quiz-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm transition-transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Tạo bài thi mới
            </Link>
            <Link
              to="/teacher/quizzes"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-700/60 hover:bg-indigo-700 text-white font-bold text-xs border border-white/20 transition-colors"
            >
              Quản lý đề thi
            </Link>
          </div>
        </div>

        {/* Decorative circle glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Tổng bài kiểm tra"
          value={stats.totalQuizzes}
          subtitle="Bao gồm cả bản thảo"
          icon={<FileQuestion className="w-5 h-5" />}
          variant="lavender"
          delay={0.05}
        />
        <StatCard
          title="Bài đang hoạt động"
          value={stats.activeQuizzes}
          subtitle="Học sinh có thể truy cập"
          icon={<CheckCircle className="w-5 h-5" />}
          variant="mint"
          delay={0.1}
        />
        <StatCard
          title="Học sinh tham gia"
          value={stats.totalStudents}
          subtitle={`Tổng lượt nộp: ${stats.totalSubmissions}`}
          icon={<Users className="w-5 h-5" />}
          variant="sky"
          delay={0.15}
        />
        <StatCard
          title="Điểm trung bình"
          value={`${(stats.averageScore / 100).toFixed(2)}/10.00`}
          subtitle="Thang điểm chuẩn 10"
          icon={<Award className="w-5 h-5" />}
          variant="peach"
          delay={0.2}
        />
      </div>

      {/* Analytics Charts */}
      <TeacherCharts
        scoreDistribution={charts.scoreDistribution}
        activityTrend={charts.activityTrend}
      />

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
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentQuizzes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có bài thi nào trong hệ thống. Nhấn <Link to="/teacher/quizzes/create" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">"Tạo bài thi mới"</Link> để bắt đầu soạn đề.
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
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors"
                  >
                    Chỉnh sửa
                  </Link>
                  <button
                    onClick={() => setDeleteQuizId(quiz.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
