import React from 'react';
import { useQuizStore } from '../../stores/quiz.store';
import { Flag, CheckCircle2 } from 'lucide-react';

export const QuestionPalette: React.FC = () => {
  const {
    questions,
    currentQuestionIndex,
    answers,
    flaggedQuestionIds,
    goToQuestion,
  } = useQuizStore();

  const answeredCount = Object.keys(answers).filter(
    (qId) => answers[qId] && answers[qId].length > 0,
  ).length;

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Danh sách câu hỏi
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Đã làm: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{answeredCount}</span> / {questions.length}
          </p>
        </div>
      </div>

      {/* Grid of Question Numbers */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentQuestionIndex;
          const isAnswered = answers[q.id] && answers[q.id].length > 0;
          const isFlagged = flaggedQuestionIds.includes(q.id);

          let buttonStyle = 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200';
          if (isFlagged) {
            buttonStyle = 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
          } else if (isAnswered) {
            buttonStyle = 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
          }

          const ringStyle = isCurrent
            ? 'ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-800 font-extrabold shadow-sm'
            : '';

          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(idx)}
              id={`palette-btn-${idx + 1}`}
              className={`relative h-10 w-full rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center border border-transparent ${buttonStyle} ${ringStyle}`}
            >
              <span>{idx + 1}</span>

              {/* Tiny icons for flagged / answered */}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                  <Flag className="w-2.5 h-2.5" />
                </span>
              )}
              {isAnswered && !isFlagged && (
                <span className="absolute -top-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700" />
          <span>Đã trả lời</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700" />
          <span>Đánh dấu lại</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600" />
          <span>Chưa làm</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-md ring-2 ring-sky-500 bg-white dark:bg-slate-800" />
          <span>Đang chọn</span>
        </div>
      </div>
    </div>
  );
};
