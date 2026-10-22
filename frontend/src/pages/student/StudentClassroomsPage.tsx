import React, { useState, useEffect } from 'react';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom } from '../../types/classroom';
import { PlusCircle, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { Modal } from '../../components/common/Modal';
import { Link } from 'react-router-dom';
import { formatUserName } from '../../utils/user.utils';

export const StudentClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { addToast } = useUiStore();

  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      const data = await ClassroomService.getStudentClasses();
      setClassrooms(data);
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải danh sách lớp học' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    
    setIsSubmitting(true);
    try {
      await ClassroomService.joinClass(inviteCode.trim());
      addToast({ type: 'success', title: 'Thành công', message: 'Tham gia lớp học thành công' });
      setShowJoinModal(false);
      setInviteCode('');
      fetchClassrooms();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Lỗi', message: error.response?.data?.message || 'Không thể tham gia lớp học. Hãy kiểm tra lại mã.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Lớp học của tôi</h1>
          <p className="text-slate-500 dark:text-slate-400">Xem bài tập và tài liệu từ giáo viên</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm shadow-sky-200 dark:shadow-none"
        >
          <PlusCircle className="w-5 h-5" />
          Tham gia lớp
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xs border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-sky-500 dark:text-sky-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Bạn chưa tham gia lớp nào</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Hãy xin mã tham gia (Invite Code) từ giáo viên của bạn để tham gia vào lớp học.
          </p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="inline-flex items-center gap-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 px-6 py-3 rounded-xl transition-colors font-semibold"
          >
            <PlusCircle className="w-5 h-5" />
            Nhập mã lớp học
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map((cls) => (
            <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-shadow group relative">
              <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-20">
                  <BookOpen className="w-32 h-32 text-white" />
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div className="flex-1 truncate pr-2">
                    <h3 className="text-xl font-bold text-white truncate">{cls.name}</h3>
                    <p className="text-emerald-100 text-sm truncate">{cls.subject}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cls.isPrivate ? 'bg-amber-100 text-amber-700' : 'bg-white/20 text-white'}`}>
                    {cls.isPrivate ? 'Private' : 'Class'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <GraduationCap className="w-5 h-5 text-teal-500" />
                  <div>
                    <p className="text-xs text-slate-400">Giáo viên</p>
                    <p className="font-medium">{cls.teacher ? formatUserName({ ...cls.teacher, role: 'TEACHER' }) : 'Đang cập nhật'}</p>
                  </div>
                </div>

                {!cls.isPrivate ? (
                  <Link
                    to={`/student/classrooms/${cls.id}`}
                    className="block w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:border-teal-400 dark:hover:text-teal-400 text-teal-700 dark:text-teal-800 text-center rounded-xl font-medium transition-all group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20"
                  >
                    Vào lớp
                  </Link>
                ) : (
                  <button
                    disabled
                    className="block w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 text-center rounded-xl font-medium cursor-not-allowed"
                  >
                    Lớp kèm 1-1
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Tham gia lớp học"
        icon={
          <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        onSubmit={handleJoinSubmit}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowJoinModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !inviteCode}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Đang xác thực...' : 'Tham gia ngay'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mã lớp học <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              aria-label="Mã lớp học"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all uppercase tracking-wider font-mono text-center text-lg"
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              Xin giáo viên của bạn mã gồm 9 ký tự (có dấu gạch ngang)
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
