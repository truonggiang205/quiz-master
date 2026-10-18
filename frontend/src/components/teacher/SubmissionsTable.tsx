import React, { useState } from 'react';
import { Submission } from '../../types/submission';
import { Search, ArrowUpDown } from 'lucide-react';
import { Badge } from '../common/Badge';
import { UserAvatar } from '../common/UserAvatar';

interface SubmissionsTableProps {
  submissions: Submission[];
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({ submissions }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filtered = submissions.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    return sortOrder === 'desc' ? b.score - a.score : a.score - b.score;
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}p ${secs}s`;
  };

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden backdrop-blur-sm">
      {/* Top filter toolbar */}
      <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs md:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          Sắp xếp điểm: {sortOrder === 'desc' ? 'Cao -> Thấp' : 'Thấp -> Cao'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5">Học sinh</th>
              <th className="px-6 py-3.5">Thời điểm nộp</th>
              <th className="px-6 py-3.5">Điểm số</th>
              <th className="px-6 py-3.5">Đúng / Sai</th>
              <th className="px-6 py-3.5">Thời gian</th>
              <th className="px-6 py-3.5">Đánh giá</th>
              <th className="px-6 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
            {sorted.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={s.studentAvatar}
                      name={s.studentName}
                      size="sm"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.studentName}
                      </div>
                      <div className="text-[11px] text-slate-400">{s.studentEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(s.submittedAt).toLocaleString('vi-VN')}
                </td>
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                  <span className="text-base text-sky-600 dark:text-sky-400">
                    {(s.score / 100).toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-normal"> / {(s.maxScore / 100).toFixed(2)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-semibold">{s.correctCount} đúng</span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-rose-500 font-semibold">{s.wrongCount} sai</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                  {formatTime(s.timeUsedSeconds)}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={s.percentage >= 80 ? 'mint' : s.percentage >= 50 ? 'sky' : 'rose'}
                    size="sm"
                  >
                    {s.percentage >= 80 ? 'Giỏi' : s.percentage >= 50 ? 'Đạt' : 'Cần cố gắng'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => window.location.href = `/teacher/quizzes/${s.quizId}/grade/${s.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 transition-colors"
                  >
                    Chấm bài
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-xs">
          Không tìm thấy lượt nộp bài nào phù hợp.
        </div>
      )}
    </div>
  );
};
