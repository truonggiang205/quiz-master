import React from 'react';
import { Bug, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import { PremiumList, PremiumListItem } from '../../components/common/PremiumList';
import { reportService } from '../../services/report.service';
import { useUiStore } from '../../stores/ui.store';

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { addToast, confirm } = useUiStore();

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getAllReports();
      setReports(data);
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi tải báo cáo' });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadReports();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Xóa báo cáo',
      description: 'Bạn có chắc muốn xóa báo cáo này?',
      variant: 'danger',
      confirmText: 'Xóa'
    });
    if (!confirmed) return;
    try {
      await reportService.deleteReport(id);
      addToast({ type: 'success', title: 'Đã xóa báo cáo' });
      loadReports();
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi xóa báo cáo' });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'RESOLVED' ? 'PENDING' : 'RESOLVED';
      await reportService.updateStatus(id, newStatus);
      addToast({ type: 'success', title: 'Cập nhật trạng thái thành công' });
      loadReports();
    } catch {
      addToast({ type: 'error', title: 'Lỗi cập nhật trạng thái' });
    }
  };

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
        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Không có báo cáo nào.</div>
        ) : reports.map((report) => (
          <PremiumListItem
            key={report.id}
            hoverColorClass={report.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-rose-500'}
            avatar={
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                report.status === 'RESOLVED' 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                  : 'bg-rose-50 border-rose-100 text-rose-600'
              }`}>
                {report.status === 'RESOLVED' ? <CheckCircle className="w-6 h-6" /> : <Bug className="w-6 h-6" />}
              </div>
            }
            rightAction={
              <div className="flex flex-col gap-2 items-end">
                <button
                  onClick={() => handleToggleStatus(report.id, report.status)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                    report.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  {report.status === 'RESOLVED' ? 'Đã giải quyết' : 'Đang chờ'}
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(report.id)} className="p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors" title="Xóa">
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
                  <span className="font-semibold text-slate-700">{report.user?.name || 'Ẩn danh'}</span>
                  {report.user?.role && <span className="px-1.5 bg-slate-100 rounded text-[10px] uppercase font-bold">{report.user.role}</span>}
                </div>
                <span>•</span>
                <span>Phân loại: {report.type}</span>
                <span>•</span>
                <span>Thiết bị: {report.browser || 'Không rõ'}</span>
                <span>•</span>
                <span>{new Date(report.createdAt).toLocaleString('vi-VN')}</span>
              </div>

              {report.screenshotUrl && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Đính kèm:</p>
                  <a href={report.screenshotUrl} target="_blank" rel="noreferrer">
                    <img src={report.screenshotUrl} alt="Screenshot" className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm hover:scale-150 transition-transform origin-bottom-left" />
                  </a>
                </div>
              )}
            </div>
          </PremiumListItem>
        ))}
      </PremiumList>
    </div>
  );
};
