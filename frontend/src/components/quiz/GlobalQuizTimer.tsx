import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuizStore } from '../../stores/quiz.store';
import { Clock, AlertCircle, Play } from 'lucide-react';
import { quizService } from '../../services/quiz.service';

export const GlobalQuizTimer: React.FC = () => {
  const { currentQuiz, remainingSeconds, isTimerRunning, decrementTimer, resetExam, startedAtMs } = useQuizStore();
  const location = useLocation();
  const navigate = useNavigate();
  const staleCheckDoneRef = useRef(false);

  // Main countdown interval
  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning, decrementTimer]);

  // Correct timer drift when user returns to tab after being away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTimerRunning && startedAtMs && currentQuiz) {
        const totalSeconds = currentQuiz.durationMinutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
        const correctedRemaining = Math.max(0, totalSeconds - elapsedSeconds);
        // Sync the store's remaining time with wall clock
        useQuizStore.setState({ remainingSeconds: correctedRemaining });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTimerRunning, startedAtMs, currentQuiz]);

  // Detect stale/orphaned exam state: quiz deleted or time truly elapsed
  useEffect(() => {
    if (!isTimerRunning || !currentQuiz || staleCheckDoneRef.current) return;
    staleCheckDoneRef.current = true;

    const checkStale = async () => {
      // 1. Wall-clock check: if startedAtMs is set and time already ran out
      if (startedAtMs) {
        const totalSeconds = currentQuiz.durationMinutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - startedAtMs) / 1000);
        if (elapsedSeconds >= totalSeconds) {
          // Time truly expired, reset orphan state
          resetExam();
          return;
        }
      }

      // 2. API check: verify quiz still exists and is still PUBLISHED
      try {
        await quizService.getQuizById(currentQuiz.id);
      } catch {
        // Quiz was deleted or unpublished — clear stale state
        resetExam();
      }
    };

    checkStale();
  }, [isTimerRunning, currentQuiz, startedAtMs, resetExam]);

  // Reset staleCheckDoneRef when quiz changes
  useEffect(() => {
    staleCheckDoneRef.current = false;
  }, [currentQuiz?.id]);

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
            isLowTime ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-sky-50 dark:bg-sky-900/50'
          }`}>
            {isLowTime ? (
              <AlertCircle className={`w-5 h-5 ${isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'} animate-pulse`} />
            ) : (
              <Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />
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
              isLowTime ? 'text-rose-600 dark:text-rose-400' : 'text-sky-600 dark:text-sky-400'
            }`}>
              {timeString}
            </span>
          </div>
          
          <button
            onClick={() => navigate(takeQuizPath)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 ${
              isLowTime ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
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
