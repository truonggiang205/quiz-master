import React, { useEffect, useState } from 'react';
import { Users, BookOpen, ShieldAlert, Activity } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { adminService } from '../../services/admin.service';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await adminService.getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load admin analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalQuizzes: 0,
    totalSubmissions: 0,
    averageScore: 0,
  };

  const activityTrend = data?.charts?.activityTrend || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tổng Quan Hệ Thống</h1>
        <p className="text-sm text-slate-500 mt-1">
          Theo dõi các chỉ số quan trọng của hệ thống QuizMaster.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng người dùng"
          value={stats.totalUsers}
          subtitle="Giáo viên & Học sinh"
          icon={<Users className="w-5 h-5" />}
          variant="lavender"
        />
        <StatCard
          title="Tổng đề thi"
          value={stats.totalQuizzes}
          subtitle="Tất cả bài kiểm tra"
          icon={<BookOpen className="w-5 h-5" />}
          variant="mint"
        />
        <StatCard
          title="Lượt nộp bài"
          value={stats.totalSubmissions}
          subtitle="Tổng hệ thống"
          icon={<Activity className="w-5 h-5" />}
          variant="sky"
        />
        <StatCard
          title="Điểm trung bình"
          value={`${stats.averageScore}/10`}
          subtitle="Toàn hệ thống"
          icon={<ShieldAlert className="w-5 h-5" />}
          variant="rose"
        />
      </div>

      {/* Activity Trend Chart */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Tần suất làm bài (7 ngày qua)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={activityTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                dx={-10}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="submissions"
                name="Lượt nộp bài"
                stroke="#6366F1"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
