import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';

export interface ScoreDistributionItem {
  range: string;
  min?: number;
  max?: number;
  count: number;
  percentage?: number;
}

export interface ActivityTrendItem {
  day: string;
  date: string;
  submissions: number;
  avgScore: number;
}

interface TeacherChartsProps {
  scoreDistribution?: ScoreDistributionItem[];
  activityTrend?: ActivityTrendItem[];
  periodDays?: number;
  onPeriodChange?: (days: number) => void;
  onSelectScoreRange?: (item: ScoreDistributionItem) => void;
  onSelectDate?: (date: string) => void;
}

export const TeacherCharts: React.FC<TeacherChartsProps> = ({
  scoreDistribution = [],
  activityTrend = [],
  periodDays = 7,
  onPeriodChange,
  onSelectScoreRange,
  onSelectDate,
}) => {
  const safeScoreDistribution = scoreDistribution.length > 0
    ? scoreDistribution
    : [
        { range: '< 5.0', count: 0, percentage: 0 },
        { range: '5.0 - 6.5', count: 0, percentage: 0 },
        { range: '6.5 - 8.0', count: 0, percentage: 0 },
        { range: '8.0 - 9.0', count: 0, percentage: 0 },
        { range: '9.0 - 10', count: 0, percentage: 0 },
      ];

  const safeActivityTrend = activityTrend.length > 0
    ? activityTrend
    : [
        { day: 'T2', date: '', submissions: 0, avgScore: 0 },
        { day: 'T3', date: '', submissions: 0, avgScore: 0 },
        { day: 'T4', date: '', submissions: 0, avgScore: 0 },
        { day: 'T5', date: '', submissions: 0, avgScore: 0 },
        { day: 'T6', date: '', submissions: 0, avgScore: 0 },
        { day: 'T7', date: '', submissions: 0, avgScore: 0 },
        { day: 'CN', date: '', submissions: 0, avgScore: 0 },
      ];

  const barColors = ['#f43f5e', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
      {/* Chart 1: Phổ Điểm Số */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm min-w-0 flex flex-col justify-between">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span>Phổ điểm thi học sinh</span>
              <span className="text-[11px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                Bấm cột để lọc
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Phân bố số lượng và tỷ lệ học sinh theo từng thang điểm
            </p>
          </div>
        </div>

        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={safeScoreDistribution}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const item = e.activePayload[0].payload as ScoreDistributionItem;
                  onSelectScoreRange?.(item);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ScoreDistributionItem;
                    return (
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="font-bold text-slate-800 dark:text-white mb-1">
                          Khoảng điểm: {data.range}
                        </div>
                        <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold">
                          <span>Số bài nộp:</span>
                          <span className="text-sm font-bold">{data.count}</span>
                          {data.percentage !== undefined && (
                            <span className="text-slate-400 font-normal">
                              ({data.percentage}%)
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 italic">
                          Click để xem chi tiết danh sách
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} cursor="pointer">
                {safeScoreDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={barColors[index % barColors.length]}
                    className="hover:opacity-80 transition-opacity"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Xu Hướng Nộp Bài & Điểm Trung Bình */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-sm min-w-0 flex flex-col justify-between">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Xu hướng nộp bài & Điểm TB
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Lượt nộp (cột xanh) và Điểm trung bình (đường cam)
            </p>
          </div>

          {onPeriodChange && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
              {[
                { label: '7 ngày', value: 7 },
                { label: '30 ngày', value: 30 },
                { label: '90 ngày', value: 90 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onPeriodChange(opt.value)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    periodDays === opt.value
                      ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart
              data={safeActivityTrend}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const item = e.activePayload[0].payload as ActivityTrendItem;
                  if (item.date) onSelectDate?.(item.date);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                interval={safeActivityTrend.length > 14 ? Math.ceil(safeActivityTrend.length / 7) : 0}
              />
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 10]}
                tick={{ fontSize: 11, fill: '#f59e0b' }}
                axisLine={false}
                tickLine={false}
                hide={true}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ActivityTrendItem;
                    return (
                      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="font-bold text-slate-800 dark:text-white mb-1">
                          {data.day} {data.date ? `(${data.date})` : ''}
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                          <span>Lượt nộp:</span>
                          <span className="font-bold">{data.submissions}</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-500 font-semibold mt-0.5">
                          <span>Điểm trung bình:</span>
                          <span className="font-bold">
                            {data.avgScore > 0 ? `${data.avgScore}/10` : '—'}
                          </span>
                        </div>
                        {data.submissions > 0 && (
                          <div className="text-[11px] text-slate-400 mt-1 italic">
                            Click để xem bài nộp ngày này
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="submissions"
                name="Lượt nộp"
                fill="#38bdf8"
                radius={[6, 6, 0, 0]}
                cursor="pointer"
              />
              <Line
                yAxisId="right"
                type="linear"
                dataKey="avgScore"
                name="Điểm TB"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
