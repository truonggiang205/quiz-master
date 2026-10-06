import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissionService } from '../../services/submission.service';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { QuizResultsResponse } from '../../types/submission';
import { SubmissionsTable } from '../../components/teacher/SubmissionsTable';
import { UnsubmittedTable } from '../../components/teacher/UnsubmittedTable';
import { StatCard } from '../../components/common/StatCard';
import { ArrowLeft, Award, TrendingUp, Users, CheckCircle2, Sparkles, Edit } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

export const TeacherQuizResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegrading, setIsRegrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'submitted' | 'unsubmitted'>('submitted');
  const { addToast } = useUiStore();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [qData, resData] = await Promise.all([
          quizService.getQuizById(id),
          submissionService.getQuizResults(id),
        ]);
        if (qData) setQuiz(qData);
        setResults(resData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleRegradeEssays = async () => {
    if (!id) return;
    setIsRegrading(true);
    addToast({
      type: 'info',
      title: 'Đang chấm tự động...',
      message: 'Hệ thống đang tự động chấm bài tự luận theo đáp án của giáo viên.',
    });
    try {
      const res = await submissionService.regradeQuizEssays(id);
      addToast({
        type: 'success',
        title: 'Chấm tự động thành công',
        message: res.message || `Đã chấm lại ${res.regradedCount} bài nộp`,
      });
      const resData = await submissionService.getQuizResults(id);
      setResults(resData);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi',
        message: err?.response?.data?.message || 'Không thể tự động chấm lại bài tự luận',
      });
    } finally {
      setIsRegrading(false);
    }
  };

  if (loading || !quiz || !results) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải kết quả bài kiểm tra...</span>
        </div>
      </div>
    );
  }

  const { statistics, submissions, unsubmittedStudents } = results;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top back navigation */}
      <div>
        <Link
          to="/teacher/quizzes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách đề thi
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Kết Quả Thi: {quiz.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Môn {quiz.subject} • {quiz.questionCount} câu hỏi • Thời lượng {quiz.durationMinutes} phút
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/teacher/quizzes/${quiz.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              Sửa đáp án / đề
            </Link>
            <button
              type="button"
              onClick={handleRegradeEssays}
              disabled={isRegrading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isRegrading ? 'Đang chấm...' : 'Chấm tự động lại bài tự luận'}
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Điểm trung bình"
          value={`${(statistics.averageScore / 100).toFixed(2)}/10.00`}
          subtitle="Toàn bộ học sinh đã nộp"
          icon={<Award className="w-5 h-5" />}
          variant="lavender"
        />
        <StatCard
          title="Điểm cao nhất"
          value={`${(statistics.highestScore / 100).toFixed(2)}/10.00`}
          subtitle="Thành tích cao nhất"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="mint"
        />
        <StatCard
          title="Điểm thấp nhất"
          value={`${(statistics.lowestScore / 100).toFixed(2)}/10.00`}
          subtitle="Cần hỗ trợ ôn tập"
          icon={<TrendingUp className="w-5 h-5 rotate-180" />}
          variant="peach"
        />
        <StatCard
          title="Tổng lượt nộp"
          value={submissions.length}
          subtitle={`Tỷ lệ hoàn thành ${statistics.completionRate}%`}
          icon={<Users className="w-5 h-5" />}
          variant="sky"
        />
      </div>

      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('submitted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'submitted'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Học sinh đã làm ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab('unsubmitted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'unsubmitted'
              ? 'border-rose-500 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Học sinh chưa làm ({(unsubmittedStudents || []).length})
        </button>
      </div>

      {activeTab === 'submitted' ? (
        <SubmissionsTable submissions={submissions} />
      ) : (
        <UnsubmittedTable students={unsubmittedStudents || []} />
      )}
    </div>
  );
};
