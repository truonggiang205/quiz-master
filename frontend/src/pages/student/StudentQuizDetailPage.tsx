import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { useQuizStore } from '../../stores/quiz.store';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { Badge } from '../../components/common/Badge';
import {
  Clock,
  FileQuestion,
  User,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Play,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

export const StudentQuizDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { currentQuiz, remainingSeconds, isTimerRunning } = useQuizStore();
  const navigate = useNavigate();

  const isResuming = currentQuiz?.id === id && (remainingSeconds > 0 || isTimerRunning);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const data = await quizService.getQuizById(id);
        if (data) setQuiz(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang tải thông tin bài thi...</span>
        </div>
      </div>
    );
  }

  const handleStartExam = () => {
    navigate(`/student/quizzes/${quiz.id}/take`);
  };

  const onButtonClick = () => {
    if (isResuming) {
      handleStartExam();
    } else {
      setIsConfirmOpen(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link
        to="/student/quizzes"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách bài thi
      </Link>

      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-sm space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="sky">{quiz.subject}</Badge>
            <Badge variant="mint">Đang mở bài thi</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {quiz.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {quiz.description || 'Không có mô tả chi tiết.'}
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 py-4 border-y border-slate-100 dark:border-slate-700/60 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Thời gian
            </span>
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              {quiz.durationMinutes} phút
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
              <FileQuestion className="w-3.5 h-3.5 text-indigo-500" /> Số câu hỏi
            </span>
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              {quiz.questionCount} câu
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
              <RotateCcw className="w-3.5 h-3.5 text-indigo-500" /> Lượt làm
            </span>
            <span className="font-bold text-slate-800 dark:text-white text-sm">
              Tối đa {quiz.totalAttempts} lần
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/40">
            <span className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
              <User className="w-3.5 h-3.5 text-indigo-500" /> Giáo viên
            </span>
            <span className="font-bold text-slate-800 dark:text-white text-sm truncate block">
              {quiz.teacherName}
            </span>
          </div>
        </div>

        {/* Rules Box */}
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
          <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Quy định phòng thi trực tuyến
          </h3>
          <ul className="text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5 list-disc list-inside leading-relaxed">
            <li>Đồng hồ đếm ngược sẽ bắt đầu chạy ngay khi bạn nhấn "Bắt đầu".</li>
            <li>Khi hết thời gian làm bài, hệ thống sẽ tự động nộp toàn bộ câu hỏi đã chọn.</li>
            <li>Bạn có thể đánh dấu các câu hỏi chưa chắc chắn để xem lại trước khi nộp.</li>
            <li>Đáp án và lời giải sẽ được mở theo lịch do giáo viên quy định.</li>
          </ul>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onButtonClick}
            id="start-exam-confirm-trigger"
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-transform hover:scale-[1.01]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isResuming ? 'Tiếp tục làm bài thi' : 'Bắt đầu làm bài thi'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleStartExam}
        title="Xác nhận bắt đầu bài thi"
        description={`Bạn có ${quiz.durationMinutes} phút để hoàn thành ${quiz.questionCount} câu hỏi. Đồng hồ đếm ngược sẽ bắt đầu ngay lập tức. Bạn đã sẵn sàng chưa?`}
        confirmText="Tôi đã sẵn sàng, bắt đầu!"
        cancelText="Để sau"
        variant="primary"
      />
    </div>
  );
};
