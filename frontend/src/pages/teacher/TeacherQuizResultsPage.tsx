import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { submissionService } from '../../services/submission.service';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { QuizResultsResponse } from '../../types/submission';
import { SubmissionsTable } from '../../components/teacher/SubmissionsTable';
import { StatCard } from '../../components/common/StatCard';
import { ArrowLeft, Award, TrendingUp, Users, CheckCircle2 } from 'lucide-react';

export const TeacherQuizResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !quiz || !results) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải kết quả bài kiểm tra...</span>
        </div>
      </div>
    );
  }

  const { statistics, submissions } = results;

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
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Kết Quả Thi: {quiz.title}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Môn {quiz.subject} • {quiz.questionCount} câu hỏi • Thời lượng {quiz.durationMinutes} phút
        </p>
      </div>

      {/* Aggregate KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Điểm trung bình"
          value={`${statistics.averageScore}/10`}
          subtitle="Toàn bộ học sinh đã nộp"
          icon={<Award className="w-5 h-5" />}
          variant="lavender"
        />
        <StatCard
          title="Điểm cao nhất"
          value={`${statistics.highestScore}/10`}
          subtitle="Thành tích cao nhất"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="mint"
        />
        <StatCard
          title="Điểm thấp nhất"
          value={`${statistics.lowestScore}/10`}
          subtitle="Cần hỗ trợ ôn tập"
          icon={<TrendingUp className="w-5 h-5 rotate-180" />}
          variant="peach"
        />
        <StatCard
          title="Tổng lượt nộp"
          value={submissions.length}
          subtitle="Tỷ lệ hoàn thành 100%"
          icon={<Users className="w-5 h-5" />}
          variant="sky"
        />
      </div>

      {/* Detailed Submissions Table */}
      <SubmissionsTable submissions={submissions} />
    </div>
  );
};
