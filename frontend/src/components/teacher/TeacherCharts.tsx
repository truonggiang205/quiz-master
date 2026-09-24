import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

interface TeacherChartsProps {
  scoreDistribution?: { range: string; count: number }[];
  activityTrend?: { day: string; submissions: number; avgScore: number }[];
}

export const TeacherCharts: React.FC<TeacherChartsProps> = ({
  scoreDistribution = [],
  activityTrend = [],
}) => {
  const safeScoreDistribution = scoreDistribution.length > 0
    ? scoreDistribution
    : [
        { range: '< 5.0', count: 0 },
        { range: '5.0 - 6.5', count: 0 },
        { range: '6.5 - 8.0', count: 0 },
        { range: '8.0 - 9.0', count: 0 },
        { range: '9.0 - 10', count: 0 },
      ];

  const safeActivityTrend = activityTrend.length > 0
    ? activityTrend
    : [
        { day: 'Thứ 2', submissions: 0, avgScore: 0 },
        { day: 'Thứ 3', submissions: 0, avgScore: 0 },
        { day: 'Thứ 4', submissions: 0, avgScore: 0 },
        { day: 'Thứ 5', submissions: 0, avgScore: 0 },
        { day: 'Thứ 6', submissions: 0, avgScore: 0 },
        { day: 'Thứ 7', submissions: 0, avgScore: 0 },
        { day: 'CN', submissions: 0, avgScore: 0 },
      ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Chart 1: Phân Phối Điểm Số */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm min-w-0">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Phổ điểm thi học sinh
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Số lượng học sinh theo từng thang điểm
          </p>
        </div>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={safeScoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" name="Số học sinh" fill="#818cf8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Xu Hướng Nộp Bài Trong Tuần */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm min-w-0">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">
            Xu hướng nộp bài trong tuần
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lượt nộp bài và điểm trung bình theo ngày
          </p>
        </div>
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={safeActivityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="submissions"
                name="Lượt nộp"
                stroke="#4ade80"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSub)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
