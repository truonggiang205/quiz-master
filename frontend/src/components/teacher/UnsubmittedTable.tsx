import React from 'react';
import { Search } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface UnsubmittedStudent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface UnsubmittedTableProps {
  students: UnsubmittedStudent[];
}

export const UnsubmittedTable: React.FC<UnsubmittedTableProps> = ({ students }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden backdrop-blur-sm">
      <div className="p-4 md:p-6 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Tìm kiếm theo tên hoặc email học sinh"
            placeholder="Tìm kiếm theo tên hoặc email học sinh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs md:text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/60 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead className="bg-slate-50/80 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5">Học sinh chưa làm bài</th>
              <th className="px-6 py-3.5 text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={s} size="sm" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    Chưa nộp bài
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="p-8 text-center text-slate-400 text-xs">
          Không tìm thấy học sinh nào.
        </div>
      )}
    </div>
  );
};
