import React, { useEffect, useState } from 'react';
import { quizService } from '../../services/quiz.service';
import { Quiz } from '../../types/quiz';
import { QuizCard } from '../../components/student/QuizCard';
import { Search } from 'lucide-react';

export const StudentQuizListPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await quizService.getQuizzes();
        // Students only see PUBLISHED quizzes
        setQuizzes(data.filter((q) => q.status === 'PUBLISHED'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const subjects = ['ALL', ...Array.from(new Set(quizzes.map((q) => q.subject)))];

  const filtered = quizzes.filter((q) => {
    const matchSearch =
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = selectedSubject === 'ALL' || q.subject === selectedSubject;
    return matchSearch && matchSubject;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Danh Sách Bài Thi Khả Dụng
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Khám phá các bài kiểm tra được giáo viên giao và chọn bài thi để thử sức
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bài thi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        {/* Subject pills */}
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedSubject === subj
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {subj === 'ALL' ? 'Tất cả môn' : subj}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} />
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="p-12 text-center bg-white/60 dark:bg-slate-800/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Hiện không có bài kiểm tra nào phù hợp với tìm kiếm của bạn.
          </p>
        </div>
      )}
    </div>
  );
};
