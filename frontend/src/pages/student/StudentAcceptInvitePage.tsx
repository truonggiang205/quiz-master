import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StudentService } from '../../services/student.service';
import { useUiStore } from '../../stores/ui.store';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export const StudentAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const teacherId = searchParams.get('t');

  useEffect(() => {
    if (!teacherId) {
      setStatus('error');
      setMessage('Đường dẫn không hợp lệ. Vui lòng kiểm tra lại link trong email.');
      return;
    }

    const acceptInvite = async () => {
      try {
        const data = await StudentService.acceptInvite(teacherId);
        setStatus('success');
        setMessage(`Bạn đã tham gia lớp dạy kèm của giáo viên ${data.teacherName} thành công!`);
        addToast({ type: 'success', title: 'Thành công', message: 'Chấp nhận lời mời thành công' });
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Không thể chấp nhận lời mời. Có thể bạn đã là học sinh của giáo viên này rồi.');
        addToast({ type: 'error', title: 'Lỗi', message: 'Không thể chấp nhận lời mời' });
      }
    };

    acceptInvite();
  }, [teacherId, navigate, addToast]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-xl border border-slate-100 dark:border-slate-800 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Đang xác thực...</h2>
            <p className="text-slate-500">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Thành công!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <p className="text-sm text-slate-400">Đang tự động chuyển về bàn học tập...</p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl transition-colors font-medium w-full"
            >
              Về Bàn học tập ngay
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Lỗi xác thực</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-xl transition-colors font-medium w-full"
            >
              Quay lại Bàn học tập
            </button>
          </>
        )}
      </div>
    </div>
  );
};
