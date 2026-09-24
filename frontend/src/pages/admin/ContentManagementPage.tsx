import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { useUiStore } from '../../stores/ui.store';
import { Search, Trash2, Clock, User, FileQuestion, Send, Megaphone } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { apiClient } from '../../services/api';

export const ContentManagementPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetRole, setTargetRole] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const { addToast } = useUiStore();

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const data = await adminService.getQuizzes(searchTerm);
      setQuizzes(data);
    } catch {
      addToast({ type: 'error', title: 'Lỗi tải danh sách bài thi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      loadQuizzes();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa vĩnh viễn bài thi "${title}" khỏi hệ thống? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      await adminService.deleteQuiz(id);
      addToast({ type: 'success', title: 'Xóa bài thi thành công' });
      loadQuizzes();
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi xóa bài thi' });
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      addToast({ type: 'error', title: 'Vui lòng nhập tiêu đề và nội dung' });
      return;
    }
    setSendingBroadcast(true);
    try {
      await apiClient.post('/notifications/broadcast', {
        title: broadcastTitle,
        message: broadcastMessage,
        targetRole,
      });
      addToast({ type: 'success', title: 'Đã phát thông báo thành công!' });
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch {
      addToast({ type: 'error', title: 'Lỗi phát thông báo' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Kiểm Duyệt Nội Dung</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý toàn bộ bài thi và gửi thông báo hệ thống.</p>
      </div>

      {/* Broadcast Section */}
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 shadow-lg shadow-indigo-200 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Phát Thông Báo Chung</h2>
            <p className="text-indigo-100 text-xs">Gửi thông báo đến chuông của người dùng (Tab Hệ thống)</p>
          </div>
        </div>
        
        <div className="space-y-4 max-w-2xl">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Tiêu đề thông báo..."
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
            />
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as any)}
              className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-sm [&>option]:text-slate-800"
            >
              <option value="ALL">Tất cả mọi người</option>
              <option value="TEACHER">Chỉ Giáo viên</option>
              <option value="STUDENT">Chỉ Học sinh</option>
            </select>
          </div>
          <div className="flex gap-4 items-end">
            <textarea
              placeholder="Nội dung chi tiết..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              rows={2}
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm resize-none"
            />
            <button
              onClick={handleSendBroadcast}
              disabled={sendingBroadcast}
              className="px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl shadow-md hover:bg-indigo-50 hover:scale-105 transition-all disabled:opacity-70 flex items-center gap-2"
            >
              {sendingBroadcast ? 'Đang gửi...' : <><Send className="w-4 h-4" /> Gửi</>}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm bài thi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Tên bài thi</th>
                <th className="px-6 py-4">Người tạo</th>
                <th className="px-6 py-4">Số lượng câu</th>
                <th className="px-6 py-4">Thời gian tạo</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : quizzes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Không tìm thấy bài thi nào.</td>
                </tr>
              ) : (
                quizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{q.title}</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {q.timeLimit} phút
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3" /> {q.teacherName}
                        </span>
                        <span className="text-xs text-slate-500">{q.teacherEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="sky" size="sm">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" /> {q.questionsCount} câu hỏi
                        </span>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleDelete(q.id, q.title)}
                        className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                        title="Xóa bài thi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
