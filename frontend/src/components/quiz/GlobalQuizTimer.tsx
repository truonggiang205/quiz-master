import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuizStore } from '../../stores/quiz.store';
import { Clock, AlertCircle, Play } from 'lucide-react';

export const GlobalQuizTimer: React.FC = () => {
  const { currentQuiz, remainingSeconds, isTimerRunning, decrementTimer } = useQuizStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, decrementTimer]);

  if (!isTimerRunning || !currentQuiz) return null;

  const takeQuizPath = `/student/quizzes/${currentQuiz.id}/take`;
  
  // If user is currently taking the quiz, don't show the global popup
  if (location.pathname === takeQuizPath) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isLowTime = remainingSeconds < 300; // Less than 5 minutes

  return (
    <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`flex flex-col gap-2 p-4 rounded-2xl shadow-xl border ${
        isLowTime 
          ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800' 
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${
            isLowTime ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-indigo-50 dark:bg-indigo-900/50'
          }`}>
            {isLowTime ? (
              <AlertCircle className={`w-5 h-5 ${isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'} animate-pulse`} />
            ) : (
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Đang trong giờ làm bài
            </p>
            <p className={`text-sm font-black ${isLowTime ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-white'} truncate max-w-[200px]`}>
              {currentQuiz.title}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xl font-black font-mono tracking-tight ${
              isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
            }`}>
              {timeString}
            </span>
          </div>
          
          <button
            onClick={() => navigate(takeQuizPath)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 ${
              isLowTime ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            Vào thi
          </button>
        </div>
      </div>
    </div>
  );
};
