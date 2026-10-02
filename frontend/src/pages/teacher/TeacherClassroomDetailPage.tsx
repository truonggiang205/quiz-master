import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom } from '../../types/classroom';
import { ArrowLeft, Users, UserMinus, FileQuestion, GraduationCap } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { User } from '../../types/user';

export const TeacherClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast, confirm } = useUiStore();

  useEffect(() => {
    if (id) {
      fetchClassroomDetails(id);
    }
  }, [id]);

  const fetchClassroomDetails = async (classId: string) => {
    try {
      const data = await ClassroomService.getClassDetails(classId);
      setClassroom(data);
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải chi tiết lớp học' });
      navigate('/teacher/classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc chắn muốn xóa học sinh ${studentName} khỏi lớp?`,
      variant: 'danger',
      confirmText: 'Xóa'
    });
    if (!confirmed) return;
    
    try {
      await ClassroomService.removeStudent(id, studentId);
      addToast({ type: 'success', title: 'Thành công', message: `Đã xóa học sinh ${studentName}` });
      // Update state locally
      setClassroom(prev => prev ? {
        ...prev,
        students: prev.students?.filter(s => s.id !== studentId)
      } : null);
    } catch (error) {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể xóa học sinh' });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div></div>;
  }

  if (!classroom) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/teacher/classrooms" className="p-2 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            {classroom.name}
            <span className="text-xs font-bold px-2 py-1 bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 rounded-md uppercase tracking-wider">
              {classroom.inviteCode}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">{classroom.subject} &bull; {classroom.students?.length || 0} Học sinh</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Students List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-500" /> Danh sách Học sinh
              </h3>
            </div>
            
            {classroom.students && classroom.students.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {classroom.students.map((student: User) => (
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
                      title="Xóa khỏi lớp"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-12 text-center">
                <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Chưa có học sinh nào tham gia lớp này.</p>
                <p className="text-sm text-slate-400 mt-1">Hãy gửi mã <strong className="text-sky-500">{classroom.inviteCode}</strong> cho học sinh.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions / Info */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Thông tin chung</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Mô tả</p>
                <p className="text-slate-700 dark:text-slate-300 text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  {classroom.description || 'Không có mô tả'}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link to="/teacher/quizzes/create" className="w-full flex justify-center items-center gap-2 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 py-3 rounded-xl font-semibold transition-colors">
                  <FileQuestion className="w-5 h-5" /> Giao bài kiểm tra mới
                </Link>
                <p className="text-xs text-center text-slate-500 mt-3 italic">* Tính năng giao bài cho riêng lớp học đang phát triển ở Giai đoạn 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
