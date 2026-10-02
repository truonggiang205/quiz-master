import React, { useState, useEffect } from 'react';
import { StudentService } from '../../services/student.service';
import { User } from '../../types/user';
import { Mail, UserMinus, UserPlus, Search, GraduationCap } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';

export const TeacherStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast, confirm } = useUiStore();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await StudentService.getMyStudents();
      setStudents(data);
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải danh sách học sinh' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    setIsSubmitting(true);
    try {
      await StudentService.inviteStudent(inviteEmail.trim());
      addToast({ type: 'success', title: 'Thành công', message: `Đã gửi lời mời đến ${inviteEmail}` });
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error: any) {
      addToast({ type: 'error', title: 'Lỗi', message: error.response?.data?.message || 'Không thể gửi lời mời. Hãy thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    const confirmed = await confirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc chắn muốn xóa học sinh ${studentName} khỏi danh bạ?`,
      variant: 'danger',
      confirmText: 'Xóa'
    });
    if (!confirmed) return;
    
    try {
      await StudentService.removeStudent(studentId);
      addToast({ type: 'success', title: 'Thành công', message: `Đã xóa học sinh ${studentName}` });
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể xóa học sinh' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Danh bạ Học sinh (Dạy Kèm)</h1>
          <p className="text-slate-500 dark:text-slate-400">Quản lý các học sinh học 1-1 hoặc tự do</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm shadow-sky-200 dark:shadow-none"
        >
          <Mail className="w-5 h-5" />
          Mời qua Email
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xs border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-sky-500 dark:text-sky-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Chưa có học sinh nào</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Gửi email lời mời cho học sinh để thêm họ vào danh bạ và bắt đầu giao bài tập 1-1.
          </p>
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 px-6 py-3 rounded-xl transition-colors font-semibold"
          >
            <Mail className="w-5 h-5" />
            Mời học sinh ngay
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-500" /> Tất cả học sinh ({students.length})
            </h3>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((student) => (
              <li key={student.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={student.avatar || `https://ui-avatars.com/api/?name=${student.name}`} alt={student.name} className="w-10 h-10 rounded-full bg-slate-200" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{student.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveStudent(student.id, student.name)}
                  className="p-2 text-red-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Xóa khỏi danh bạ"
                >
                  <UserMinus className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Mời học sinh qua Email</h3>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Địa chỉ Email học sinh *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="hocsinh@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
                <p className="text-xs text-slate-500 mt-2">Hệ thống sẽ gửi một link mời đặc biệt tới địa chỉ email này.</p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !inviteEmail}
                  className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi lời mời'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
