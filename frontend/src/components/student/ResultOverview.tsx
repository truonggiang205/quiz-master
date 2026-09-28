import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, HelpCircle, Clock } from 'lucide-react';
import { Submission } from '../../types/submission';

interface ResultOverviewProps {
  submission: Submission;
}

export const ResultOverview: React.FC<ResultOverviewProps> = ({ submission }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} phút ${secs} giây`;
  };

  const isHigh = submission.percentage >= 80;
  const isPass = submission.percentage >= 50;

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left: Score Badge Gauge */}
        <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-indigo-50/70 to-sky-50/70 dark:from-slate-900/60 dark:to-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-center">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mb-3">
            <Trophy className={`w-8 h-8 ${isHigh ? 'text-amber-500' : isPass ? 'text-indigo-500' : 'text-slate-400'}`} />
          </div>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              {(submission.score / 100).toFixed(2)}
            </span>
            <span className="text-slate-400 text-sm font-semibold"> / {(submission.maxScore / 100).toFixed(2)}</span>
          </motion.div>

          <div className="mt-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/80 px-3 py-1 rounded-full">
            Đạt {submission.percentage}%
          </div>
        </div>

        {/* Right: Metrics Grid */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3.5">
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100/80 dark:border-emerald-900/40 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="block text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                Số câu đúng
              </span>
              <span className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                {submission.correctCount} câu
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100/80 dark:border-rose-900/40 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <div>
              <span className="block text-xs text-rose-700 dark:text-rose-300 font-medium">
                Số câu sai
              </span>
              <span className="text-lg font-bold text-rose-900 dark:text-rose-100">
                {submission.wrongCount} câu
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <span className="block text-xs text-slate-500 dark:text-slate-400 font-medium">
                Chưa trả lời
              </span>
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                {submission.unansweredCount} câu
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100/80 dark:border-sky-900/40 flex items-center gap-3">
            <Clock className="w-5 h-5 text-sky-500 flex-shrink-0" />
            <div>
              <span className="block text-xs text-sky-700 dark:text-sky-300 font-medium">
                Thời gian làm bài
              </span>
              <span className="text-lg font-bold text-sky-900 dark:text-sky-100">
                {formatTime(submission.timeUsedSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
