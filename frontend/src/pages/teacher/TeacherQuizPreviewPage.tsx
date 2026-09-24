import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { Question } from '../../types/question';
import { QuestionCard } from '../../components/quiz/QuestionCard';
import { ArrowLeft, ArrowRight, Eye, Sparkles } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const TeacherQuizPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [qData, qsData] = await Promise.all([
          quizService.getQuizById(id),
          quizService.getQuestions(id, false),
        ]);
        if (qData) setQuiz(qData);
        setQuestions(qsData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading || !quiz) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-4 max-w-xl mx-auto text-center py-12">
        <p className="text-sm text-slate-500">Bài thi này chưa có câu hỏi nào để xem trước.</p>
        <Link
          to={`/teacher/quizzes/${id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600"
        >
          Thêm câu hỏi ngay
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const selected = selectedAnswers[currentQ.id] || [];
  const isFlagged = flaggedIds.includes(currentQ.id);

  const handleSelectOption = (optId: string) => {
    if (currentQ.type === 'MULTIPLE_CHOICE') {
      const list = selected.includes(optId) ? selected.filter((i) => i !== optId) : [...selected, optId];
      setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: list });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: [optId] });
    }
  };

  const handleToggleFlag = () => {
    setFlaggedIds(
      isFlagged ? flaggedIds.filter((i) => i !== currentQ.id) : [...flaggedIds, currentQ.id],
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Banner indicating preview mode */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
              Chế độ xem trước của Giáo viên (Preview Mode)
            </h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Đây là giao diện chuẩn xác mà học sinh sẽ nhìn thấy khi làm bài thi.
            </p>
          </div>
        </div>

        <Link
          to={`/teacher/quizzes/${id}/edit`}
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-xs border border-amber-200 dark:border-slate-700"
        >
          Trở về chỉnh sửa
        </Link>
      </div>

      <QuestionCard
        question={currentQ}
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
        selectedOptionIds={selected}
        isFlagged={isFlagged}
        onSelectOption={handleSelectOption}
        onToggleFlag={handleToggleFlag}
      />

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            currentIndex === 0
              ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800'
              : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Câu trước</span>
        </button>

        <span className="text-xs text-slate-400 font-semibold">
          {currentIndex + 1} / {questions.length}
        </span>

        <button
          type="button"
          onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
          disabled={currentIndex === questions.length - 1}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            currentIndex === questions.length - 1
              ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800'
              : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <span>Câu tiếp</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
