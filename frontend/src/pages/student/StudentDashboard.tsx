import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await dashboardService.getStudentDashboard();
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error fetching student dashboard:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const { user } = useAuthStore();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải góc học tập của bạn...</span>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    availableCount: 0,
    completedCount: 0,
    averageScore: 0,
    highestScore: 0,
  };

  const availableQuizzes = data?.availableQuizzes || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div className="space-y-8">
      {/* Student Welcome Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400 text-white shadow-lg shadow-indigo-200/50 dark:shadow-none overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Học tập chủ động
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            Chào mừng, {user?.name || 'Học Sinh'}! 🎓
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Bạn có <span className="font-bold underline">{stats.availableCount} bài kiểm tra</span> đang sẵn sàng để thử sức. Hãy chuẩn bị tinh thần và bắt đầu ngay!
          </p>

          <div className="mt-5 flex items-center gap-3">
            <Link
              to="/student/quizzes"
              id="student-dashboard-quizzes-btn"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-xs shadow-sm transition-transform hover:scale-105"
            >
              <span>Xem tất cả bài thi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="absolute -right-8 -bottom-8 w-60 h-60 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* Student Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Bài thi khả dụng"
          value={stats.availableCount}
          subtitle="Chưa hoàn thành"
          icon={<FileQuestion className="w-5 h-5" />}
          variant="lavender"
          delay={0.05}
        />
        <StatCard
          title="Bài đã hoàn thành"
          value={stats.completedCount}
          subtitle="Đã chấm điểm"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="mint"
          delay={0.1}
        />
        <StatCard
          title="Điểm trung bình"
          value={`${stats.averageScore}/10`}
          subtitle="Tỷ lệ đạt chuẩn tốt"
          icon={<Award className="w-5 h-5" />}
          variant="peach"
          delay={0.15}
        />
        <StatCard
          title="Điểm cao nhất"
          value={`${stats.highestScore}/10`}
          subtitle="Thành tích kỷ lục"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="sky"
          delay={0.2}
        />
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
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {availableQuizzes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            Hiện tại chưa có bài kiểm tra nào đang mở. Hãy quay lại sau nhé!
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
        <div className="mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Lịch sử làm bài gần đây
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Xem lại kết quả thi và đáp án khi đến hạn công bố
          </p>
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
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {sub.score}
                  </span>
                  <span className="text-xs text-slate-400 font-normal"> / {sub.maxScore}</span>
                </div>

                <Link
                  to={`/student/quizzes/${sub.quizId}/result?submissionId=${sub.id}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors"
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
