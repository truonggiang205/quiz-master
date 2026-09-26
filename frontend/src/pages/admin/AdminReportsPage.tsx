import React from 'react';
import { Bug, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import { PremiumList, PremiumListItem } from '../../components/common/PremiumList';

export const AdminReportsPage: React.FC = () => {
  // Mock data for reports
  const mockReports = [
    {
      id: 1,
      title: 'Không thể nộp bài khi hết giờ',
      description: 'Khi thời gian đếm ngược về 0, hệ thống không tự động nộp bài mà hiện lỗi mạng.',
      type: 'Chức năng',
      priority: 'Cao',
      browser: 'Chrome, Windows 11',
      screenshotUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=100&q=80',
      status: 'Đang chờ',
      user: { name: 'Nguyễn Văn A', role: 'STUDENT' },
      createdAt: '10 phút trước'
    },
    {
      id: 2,
      title: 'Lỗi hiển thị công thức toán học',
      description: 'Công thức latex trong đề thi Vật Lý không render đúng trên điện thoại.',
      type: 'Giao diện (UI)',
      priority: 'Trung bình',
      browser: 'Safari, iOS 16',
      screenshotUrl: null,
      status: 'Đã giải quyết',
      user: { name: 'Trần Giáo Viên', role: 'TEACHER' },
      createdAt: '2 giờ trước'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Cao': return 'text-rose-600 bg-rose-50 border border-rose-200';
      case 'Trung bình': return 'text-amber-600 bg-amber-50 border border-amber-200';
      case 'Thấp': return 'text-emerald-600 bg-emerald-50 border border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Báo Cáo Người Dùng</h1>
        <p className="text-slate-500 mt-2">Quản lý và xử lý các lỗi hoặc phản hồi từ Giáo viên và Học sinh.</p>
      </div>

      <PremiumList>
        {mockReports.map((report) => (
          <PremiumListItem
            key={report.id}
            hoverColorClass={report.status === 'Đã giải quyết' ? 'bg-emerald-500' : 'bg-rose-500'}
            avatar={
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                report.status === 'Đã giải quyết' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                  : 'bg-rose-50 border-rose-100 text-rose-600'
              }`}>
                {report.status === 'Đã giải quyết' ? <CheckCircle className="w-6 h-6" /> : <Bug className="w-6 h-6" />}
              </div>
            }
            rightAction={
              <div className="flex flex-col gap-2 items-end">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  report.status === 'Đã giải quyết' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {report.status}
                </span>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors" title="Xem chi tiết">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            }
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-slate-900">{report.title}</h3>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${getPriorityColor(report.priority)}`}>
                  {report.priority}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-2">{report.description}</p>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">{report.user.name}</span>
                  <span className="px-1.5 bg-slate-100 rounded text-[10px] uppercase font-bold">{report.user.role}</span>
                </div>
                <span>•</span>
                <span>Phân loại: {report.type}</span>
                <span>•</span>
                <span>Thiết bị: {report.browser}</span>
                <span>•</span>
                <span>{report.createdAt}</span>
              </div>

              {report.screenshotUrl && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Đính kèm:</p>
                  <img src={report.screenshotUrl} alt="Screenshot" className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                </div>
              )}
            </div>
          </PremiumListItem>
        ))}
      </PremiumList>
    </div>
  );
};
