import React from 'react';
import { Link } from 'react-router-dom';
import { Quiz } from '../../types/quiz';
import { Clock, FileText, UserCheck, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';

interface QuizCardProps {
  quiz: Quiz;
  hasCompleted?: boolean;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, hasCompleted = false }) => {
  return (
    <div className="group bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="sky" size="sm">
            {quiz.subject}
          </Badge>
          <span className="text-[11px] font-semibold text-slate-400">
            {quiz.durationMinutes} phút
          </span>
        </div>

        <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2 mb-2">
          {quiz.title}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {quiz.description || 'Không có mô tả chi tiết cho bài kiểm tra này.'}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          <span>{quiz.questionCount} câu hỏi</span>
        </div>

        <Link
          to={`/student/quizzes/${quiz.id}`}
          id={`start-quiz-btn-${quiz.id}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors"
        >
          <span>{hasCompleted ? 'Xem lại' : 'Vào làm bài'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
};
