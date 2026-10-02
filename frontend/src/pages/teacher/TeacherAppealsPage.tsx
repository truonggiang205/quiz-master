import React, { useEffect, useState } from 'react';
import { appealService, Appeal } from '../../services/appeal.service';
import { useUiStore } from '../../stores/ui.store';
import { FileText, CheckCircle, XCircle, Search, MessageSquare } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const TeacherAppealsPage: React.FC = () => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const { addToast } = useUiStore();

  useEffect(() => {
    loadAppeals();
  }, []);

  const loadAppeals = async () => {
    try {
      const data = await appealService.getMyAppeals();
      setAppeals(data);
    } catch {
      addToast({ type: 'error', title: 'Lỗi tải danh sách phúc khảo' });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const reply = replyText[id] || '';
    if (!reply && status === 'REJECTED') {
      addToast({ type: 'error', title: 'Vui lòng nhập lý do từ chối' });
      return;
    }
    
    try {
      await appealService.replyAppeal(id, status, reply);
      addToast({ type: 'success', title: 'Đã phản hồi phúc khảo' });
      loadAppeals();
    } catch {
      addToast({ type: 'error', title: 'Lỗi xử lý phúc khảo' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Yêu Cầu Phúc Khảo</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý và giải quyết khiếu nại điểm số từ học sinh.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="text-center py-10 text-slate-400">Đang tải...</div>
        ) : appeals.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không có yêu cầu phúc khảo nào</h3>
            <p className="text-slate-500">Tuyệt vời! Tất cả học sinh đều hài lòng với điểm số.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {appeals.map(a => (
              <div key={a.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-6">
                
                {/* Info block */}
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{a.submission?.quizTitle || 'Bài thi'}</h4>
                      <p className="text-sm text-slate-500">Học sinh: <span className="font-semibold text-slate-700">{a.student?.name}</span> ({a.student?.email})</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                    <div>
                      {a.status === 'PENDING' && <Badge variant="lavender" size="sm">Đang chờ</Badge>}
                      {a.status === 'APPROVED' && <Badge variant="mint" size="sm">Đã duyệt</Badge>}
                      {a.status === 'REJECTED' && <Badge variant="rose" size="sm">Từ chối</Badge>}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Lý do học sinh khiếu nại:</p>
                    <p className="text-sm text-slate-700">{a.reason}</p>
                  </div>
                </div>

                {/* Action block */}
                <div className="w-full md:w-1/3 flex flex-col justify-end space-y-3">
                  {a.status === 'PENDING' ? (
                    <>
                      <textarea
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-sky-500 bg-white shadow-sm resize-none"
                        rows={2}
                        placeholder="Nhập lời nhắn phản hồi..."
                        value={replyText[a.id] || ''}
                        onChange={(e) => setReplyText(prev => ({ ...prev, [a.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(a.id, 'APPROVED')}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Chấp nhận
                        </button>
                        <button
                          onClick={() => handleReply(a.id, 'REJECTED')}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-md transition-all text-sm"
                        >
                          <XCircle className="w-4 h-4" /> Từ chối
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm opacity-70">
                      <p className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">Phản hồi của bạn:</p>
                      <p className="text-sm text-slate-700 italic">{a.teacherReply || 'Không có'}</p>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
