import React, { useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { useQuizStore } from '../../stores/quiz.store';

interface QuizTimerProps {
  onTimeExpired: () => void;
}

export const QuizTimer: React.FC<QuizTimerProps> = ({ onTimeExpired }) => {
  const { remainingSeconds, decrementTimer, isTimerRunning } = useQuizStore();

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onTimeExpired();
    }
  }, [remainingSeconds, onTimeExpired]);

  // Format mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color warning thresholds
  const isDanger = remainingSeconds <= 300; // <= 5 minutes
  const isWarning = !isDanger && remainingSeconds <= 600; // <= 10 minutes

  let badgeStyle = 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
  if (isDanger) {
    badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 animate-pulse-glow';
  } else if (isWarning) {
    badgeStyle = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border font-mono font-bold text-sm shadow-xs transition-colors duration-300 ${badgeStyle}`}
      title={isDanger ? 'Cảnh báo: Còn dưới 5 phút!' : isWarning ? 'Lưu ý: Còn dưới 10 phút' : 'Thời gian làm bài còn lại'}
    >
      {isDanger ? (
        <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
      ) : (
        <Clock className={`w-4 h-4 ${isWarning ? 'text-amber-500' : 'text-indigo-500'}`} />
      )}
      <span className="text-base tracking-wider">{formattedTime}</span>
    </div>
  );
};
