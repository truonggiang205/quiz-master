import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft, Save, Edit3, Loader2 } from 'lucide-react';
import { useUiStore } from '../../../stores/ui.store';
import { documentImportService, DocumentImportSession, ParsedQuestion, ParsedOption } from '../../../services/document-import.service';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export const TeacherQuestionImportPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [session, setSession] = useState<DocumentImportSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (id) {
      loadSession();
    }
  }, [id]);

  const loadSession = async () => {
    try {
      const res = await documentImportService.getSession(id!);
      setSession(res.data);
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi tải phiên làm việc' });
      navigate('/teacher/import');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContent = (qId: string, content: string) => {
    if (!session) return;
    const newQs = session.rawData.map(q => q.id === qId ? { ...q, content } : q);
    setSession({ ...session, rawData: newQs });
  };

  const handleUpdateOption = (qId: string, optIdx: number, text: string) => {
    if (!session) return;
    const newQs = session.rawData.map(q => {
      if (q.id === qId) {
        const newOpts = [...q.options];
        newOpts[optIdx] = { ...newOpts[optIdx], text };
        return { ...q, options: newOpts };
      }
      return q;
    });
    setSession({ ...session, rawData: newQs });
  };

  const handleSaveDraft = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const res = await documentImportService.updateSession(id!, session.rawData);
      setSession(res.data);
      addToast({ type: 'success', title: 'Đã lưu chỉnh sửa và phân tích lại' });
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi khi lưu' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!session) return;
    setConfirming(true);
    try {
      const res = await documentImportService.confirmImport(id!);
      addToast({ type: 'success', title: res.message || 'Import thành công vào ngân hàng' });
      navigate('/teacher/quizzes');
    } catch (error: any) {
      addToast({ type: 'error', title: error.response?.data?.message || 'Lỗi khi xác nhận' });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;
  if (!session) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" onClick={() => navigate('/teacher/import')}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Import Preview</h1>
            <p className="text-slate-500 text-sm">File: {session.originalFileName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50" onClick={handleSaveDraft} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Lưu Nháp
          </button>
          <button className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50" onClick={handleConfirm} disabled={confirming || session.summary.error > 0}>
            {confirming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Xác nhận Import
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          <div className="text-sm text-slate-500 mb-1">Tổng số câu</div>
          <div className="text-2xl font-bold">{session.summary.total}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-900/50 text-center">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">Hợp lệ</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{session.summary.valid}</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-900/50 text-center">
          <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Cảnh báo</div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{session.summary.warning}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-center">
          <div className="text-sm text-red-600 dark:text-red-400 mb-1">Lỗi</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{session.summary.error}</div>
        </div>
      </div>

      {session.summary.error > 0 && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Bạn cần sửa tất cả các câu có lỗi trước khi xác nhận. Hãy bấm "Lưu Nháp" sau khi sửa.</span>
        </div>
      )}

      <div className="space-y-4">
        {session.rawData.map((q, i) => (
          <div key={q.id} className={`p-5 rounded-xl border ${q.status === 'ERROR' ? 'border-red-300 bg-red-50/50' : q.status === 'WARNING' ? 'border-yellow-300 bg-yellow-50/50' : 'border-slate-200 bg-white'} dark:bg-slate-800`}>
            <div className="flex justify-between mb-4">
              <div className="font-bold flex items-center gap-2">
                Câu {q.questionNumber || i + 1}
                {q.status === 'VALID' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {q.status === 'WARNING' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                {q.status === 'ERROR' && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>

            {q.warnings && q.warnings.length > 0 && (
              <div className="mb-4 space-y-1">
                {q.warnings.map((w, idx) => (
                  <div key={idx} className={`text-sm ${w.includes('ERROR') ? 'text-red-600' : 'text-yellow-600'}`}>
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Nội dung</label>
                <textarea 
                  className="w-full mt-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                  rows={3}
                  value={q.content}
                  onChange={(e) => handleUpdateContent(q.id, e.target.value)}
                />
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                   <Latex>{q.content}</Latex>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex gap-2 items-start">
                     <div className={`mt-2 font-bold ${opt.isCorrect ? 'text-green-600' : 'text-slate-500'}`}>
                       {opt.label}.
                     </div>
                     <div className="flex-1">
                       <textarea 
                          className={`w-full p-2 text-sm rounded-lg border ${opt.isCorrect ? 'border-green-300 bg-green-50' : 'border-slate-200'} bg-transparent`}
                          rows={2}
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(q.id, optIdx, e.target.value)}
                       />
                       <div className="mt-1 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs overflow-hidden">
                          <Latex>{opt.text}</Latex>
                       </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
