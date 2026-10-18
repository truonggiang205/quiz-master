import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom } from '../../types/classroom';
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { UserAvatar } from '../../components/common/UserAvatar';

export const StudentClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useUiStore();

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
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải chi tiết lớp học hoặc bạn không có quyền xem' });
      navigate('/student/classrooms');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>;
  }

  if (!classroom) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/student/classrooms" className="p-2 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{classroom.name}</h1>
          <p className="text-slate-500 dark:text-slate-400">{classroom.subject}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 p-12 text-center">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Chưa có bài tập nào</h3>
            <p className="text-slate-500">Giáo viên chưa giao bài tập hoặc đề thi nào cho lớp này.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Giáo viên phụ trách</h3>
            <div className="flex items-center gap-4 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/30">
              <UserAvatar user={classroom.teacher} size="lg" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">{classroom.teacher?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{classroom.teacher?.email}</p>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Mô tả lớp học</h4>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                {classroom.description || 'Không có thông tin mô tả'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
