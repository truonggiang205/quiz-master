import React, { useState, useEffect } from 'react';
import { Lock, Clock, Sparkles } from 'lucide-react';

interface AnswerReleaseCountdownProps {
  releaseDateString: string;
  onReleased?: () => void;
}

export const AnswerReleaseCountdown: React.FC<AnswerReleaseCountdownProps> = ({
  releaseDateString,
  onReleased,
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const target = new Date(releaseDateString).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (onReleased) onReleased();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isPast: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [releaseDateString, onReleased]);

  const releaseFormatted = new Date(releaseDateString).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (timeLeft.isPast) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Đáp án & Lời giải đã được mở!
          </h4>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
            Bạn có thể cuộn xuống để xem chi tiết đáp án đúng và phần giải thích của từng câu hỏi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 backdrop-blur-sm">
      <div className="flex items-start gap-3.5 mb-4">
        <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
            Đáp án & Lời giải đang được khóa
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Giáo viên thiết lập thời gian công bố vào lúc:{' '}
            <strong className="underline">{releaseFormatted}</strong>
          </p>
        </div>
      </div>

      {/* Countdown Digits */}
      <div className="flex items-center justify-center gap-2 text-center py-2">
        <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl shadow-xs border border-amber-200/60 dark:border-slate-700">
          <span className="block text-xl font-extrabold text-amber-800 dark:text-amber-200 font-mono">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Giờ</span>
        </div>
        <span className="text-lg font-bold text-amber-500">:</span>
        <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl shadow-xs border border-amber-200/60 dark:border-slate-700">
          <span className="block text-xl font-extrabold text-amber-800 dark:text-amber-200 font-mono">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Phút</span>
        </div>
        <span className="text-lg font-bold text-amber-500">:</span>
        <div className="bg-white dark:bg-slate-800 px-3.5 py-2 rounded-2xl shadow-xs border border-amber-200/60 dark:border-slate-700">
          <span className="block text-xl font-extrabold text-amber-800 dark:text-amber-200 font-mono">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400">Giây</span>
        </div>
      </div>
    </div>
  );
};
