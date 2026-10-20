import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentService } from '../../services/student.service';
import { StudentDetailResponse, UpdateTeacherStudentPayload } from '../../types/student';
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  School,
  Calendar,
  Link2,
  Unlink,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  DollarSign,
  BookOpen,
  Award,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  FileText,
} from 'lucide-react';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Modal } from '../../components/common/Modal';
import { useUiStore } from '../../stores/ui.store';
import { withNotification } from '../../utils/notification.util';

export const TeacherStudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast, confirm } = useUiStore();

  const [data, setData] = useState<StudentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'SCHEDULE' | 'ATTENDANCE' | 'LOGS' | 'SCORES' | 'TUITION' | 'PAYMENTS'
  >('OVERVIEW');

  // Modals
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<UpdateTeacherStudentPayload>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadStudentDetail(id);
    }
  }, [id]);

  const loadStudentDetail = async (studentId: string) => {
    setIsLoading(true);
    try {
      const res = await StudentService.getStudentDetail(studentId);
      setData(res);
      setEditForm({
        fullName: res.student.fullName,
        phone: res.student.phone || '',
        email: res.student.email || '',
        parentName: res.student.parentName || '',
        parentPhone: res.student.parentPhone || '',
        dob: res.student.dob || '',
        gender: res.student.gender || 'MALE',
        school: res.student.school || '',
        note: res.student.note || '',
        status: res.student.status,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: 'Không tìm thấy hồ sơ học sinh hoặc bạn không có quyền truy cập',
      });
      navigate('/teacher/students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !linkInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const term = linkInput.trim();

    try {
      await withNotification(
        {
          actionKey: `link-account-${id}`,
          loadingTitle: 'Đang liên kết tài khoản...',
          loadingMessage: `Đang liên kết với ${term}`,
          successTitle: 'Thành công',
          successMessage: 'Đã liên kết tài khoản QuizMaster thành công',
          errorTitle: 'Lỗi liên kết tài khoản',
        },
        async () => {
          await StudentService.linkAccount(id, { emailOrAccountId: term });
          setShowLinkModal(false);
          setLinkInput('');
          await loadStudentDetail(id);
        }
      );
    } catch {
      // Handled by withNotification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!id || isSubmitting) return;

    const confirmed = await confirm({
      title: 'Hủy liên kết tài khoản',
      description:
        'Bạn có chắc chắn muốn hủy liên kết tài khoản QuizMaster của học sinh này? Toàn bộ lịch sử học tập, học phí và điểm số vẫn sẽ được giữ nguyên 100%.',
      variant: 'warning',
      confirmText: 'Hủy liên kết',
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await withNotification(
        {
          actionKey: `unlink-account-${id}`,
          loadingTitle: 'Đang hủy liên kết...',
          successTitle: 'Thành công',
          successMessage: 'Đã chuyển học sinh về chế độ học sinh thủ công',
          errorTitle: 'Lỗi',
          errorMessage: 'Không thể hủy liên kết tài khoản',
        },
        async () => {
          await StudentService.unlinkAccount(id);
          await loadStudentDetail(id);
        }
      );
    } catch {
      // Handled by withNotification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editForm.fullName?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await withNotification(
        {
          actionKey: `update-student-${id}`,
          loadingTitle: 'Đang cập nhật hồ sơ...',
          successTitle: 'Thành công',
          successMessage: 'Đã cập nhật thông tin học sinh',
          errorTitle: 'Lỗi cập nhật',
        },
        async () => {
          await StudentService.updateStudent(id, editForm);
          setShowEditModal(false);
          await loadStudentDetail(id);
        }
      );
    } catch {
      // Handled by withNotification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!id || !data) return;

    const confirmed = await confirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc chắn muốn xóa học sinh ${data.student.fullName}?`,
      variant: 'danger',
      confirmText: 'Xóa',
    });
    if (!confirmed) return;

    try {
      await withNotification(
        {
          actionKey: `delete-student-${id}`,
          loadingTitle: 'Đang xóa hồ sơ...',
          successTitle: 'Thành công',
          successMessage: 'Đã xóa học sinh khỏi danh bạ',
          errorTitle: 'Lỗi',
        },
        async () => {
          await StudentService.deleteStudent(id);
          navigate('/teacher/students');
        }
      );
    } catch {
      // Handled by withNotification
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { student, account, isExternal, summary } = data;
  const displayName = student.fullName || student.name || 'Học sinh';
  const displayEmail = student.email || account?.email;

  return (
    <div className="space-y-6">
      {/* Top navigation back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/teacher/students')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Danh bạ học sinh / Chi tiết
        </span>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <UserAvatar
              src={student.avatar || account?.avatar}
              name={displayName}
              size="xl"
              ring
              ringColor="ring-sky-200 dark:ring-sky-900"
            />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h1>

                {/* Badge External / Linked */}
                {isExternal ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                    <UserX className="w-3.5 h-3.5" /> HỌC SINH THỦ CÔNG
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                    <UserCheck className="w-3.5 h-3.5" /> ĐÃ LIÊN KẾT TÀI KHOẢN
                  </span>
                )}
              </div>

              {/* Account connection status */}
              <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                {isExternal ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Chưa liên kết tài khoản QuizMaster
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Link2 className="w-3.5 h-3.5" />
                    QuizMaster ID: {student.studentAccountId} ({account?.email})
                  </span>
                )}

                {displayEmail && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {displayEmail}
                  </span>
                )}

                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {student.phone}
                  </span>
                )}

                {student.school && (
                  <span className="flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    {student.school}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {isExternal ? (
              <button
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm shadow-emerald-200 dark:shadow-none"
              >
                <Link2 className="w-4 h-4" />
                Liên kết tài khoản
              </button>
            ) : (
              <button
                onClick={handleUnlinkAccount}
                className="flex items-center gap-2 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
              >
                <Unlink className="w-4 h-4" />
                Hủy liên kết
              </button>
            )}

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Sửa hồ sơ
            </button>

            <button
              onClick={handleDeleteStudent}
              className="p-2 border border-red-200 dark:border-red-900/60 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="Xóa học sinh"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs text-slate-400">Buổi đã học</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {summary.attendedLessons} / {summary.totalLessons}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Tổng học phí</p>
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
              {summary.totalTuition.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Còn nợ</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {summary.remainingTuition.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Điểm trung bình</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {summary.avgScore > 0 ? summary.avgScore.toFixed(1) : '---'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (7 Sections) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
        {[
          { key: 'OVERVIEW', label: '1. Thông tin học sinh', icon: GraduationCap },
          { key: 'SCHEDULE', label: `2. Lịch dạy (${data.schedules.length})`, icon: Calendar },
          { key: 'ATTENDANCE', label: `3. Điểm danh (${data.attendance.length})`, icon: Clock },
          { key: 'LOGS', label: `4. Nhật ký (${data.learningLogs.length})`, icon: BookOpen },
          { key: 'SCORES', label: `5. Điểm số (${data.scores.length})`, icon: Award },
          { key: 'TUITION', label: `6. Học phí (${data.tuitions.length})`, icon: DollarSign },
          { key: 'PAYMENTS', label: `7. Thanh toán (${data.payments.length})`, icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`pb-3 px-3.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile Information */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" /> Thông tin cá nhân
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Họ và tên:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{displayName}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{student.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{displayEmail || 'Chưa cập nhật'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Ngày sinh:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{student.dob || 'Chưa cập nhật'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Giới tính:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {student.gender === 'FEMALE' ? 'Nữ' : student.gender === 'OTHER' ? 'Khác' : 'Nam'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Trường học:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{student.school || 'Chưa cập nhật'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span
                  className={`font-semibold ${
                    student.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                >
                  {student.status === 'ACTIVE' ? 'Đang theo học' : 'Nghỉ học'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" /> Thông tin phụ huynh & Ghi chú
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Tên phụ huynh:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {student.parentName || 'Chưa cập nhật'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Số điện thoại phụ huynh:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {student.parentPhone || 'Chưa cập nhật'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Ghi chú & Mục tiêu học tập:</p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                {student.note || 'Chưa có ghi chú đặc biệt cho học sinh này.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Schedule Lessons */}
      {activeTab === 'SCHEDULE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Lịch dạy kèm</h3>
          {data.schedules.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa có buổi học nào được lên lịch.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.schedules.map((lesson: any) => (
                <div key={lesson.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{lesson.title}</p>
                    <p className="text-xs text-slate-400">
                      {lesson.date} | {lesson.startTime} - {lesson.endTime} ({lesson.duration || 1.5}h)
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                    {lesson.status || 'SCHEDULED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Attendance */}
      {activeTab === 'ATTENDANCE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Lịch sử điểm danh</h3>
          {data.attendance.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa có dữ liệu điểm danh.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.attendance.map((att: any) => (
                <div key={att.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {att.lesson?.title || 'Buổi học'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Ngày: {att.lesson?.date || '---'} | Ghi chú: {att.note || 'Không có'}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      att.attendanceStatus === 'ATTENDED'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : att.attendanceStatus === 'EXCUSED'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    }`}
                  >
                    {att.attendanceStatus === 'ATTENDED'
                      ? 'Có mặt'
                      : att.attendanceStatus === 'EXCUSED'
                      ? 'Có phép'
                      : 'Vắng mặt'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Learning Logs */}
      {activeTab === 'LOGS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Nhật ký học tập</h3>
          {data.learningLogs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa có nhật ký học tập nào.</p>
          ) : (
            <div className="space-y-3">
              {data.learningLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-sm space-y-2"
                >
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>{log.date || log.lesson?.date || '---'}</span>
                    <span>Đánh giá thái độ: {log.attitude || 'Tốt'}</span>
                  </div>
                  {log.content && (
                    <p className="text-slate-800 dark:text-slate-200">
                      <strong>Nội dung:</strong> {log.content}
                    </p>
                  )}
                  {log.homework && (
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      <strong>Bài tập về nhà:</strong> {log.homework}
                    </p>
                  )}
                  {log.comment && (
                    <p className="text-sky-600 dark:text-sky-400 text-xs italic">
                      <strong>Nhận xét:</strong> {log.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Scores */}
      {activeTab === 'SCORES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Bảng điểm & Đánh giá</h3>
          {data.scores.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa có điểm số nào.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.scores.map((score: any) => (
                <div key={score.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {score.assessmentName || 'Bài kiểm tra'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Ngày: {score.date} | Loại: {score.assessmentType}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {score.score} / {score.maxScore || 10}
                    </span>
                    {score.comment && <p className="text-xs text-slate-400">{score.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Tuition */}
      {activeTab === 'TUITION' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Học phí theo tháng</h3>
          {data.tuitions.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa có bảng học phí nào.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.tuitions.map((t: any) => (
                <div key={t.id} className="py-3.5 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">Tháng {t.month}</p>
                    <p className="text-xs text-slate-400">
                      Số buổi: {t.lessonCount || 0} ({t.totalHours || 0}h)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {Number(t.totalAmount || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Còn lại: {Number(t.remainingAmount || 0).toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Payment History */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Lịch sử thanh toán</h3>
          {data.payments.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Chưa phát sinh giao dịch thanh toán nào.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.payments.map((p: any) => (
                <div key={p.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {Number(p.amount || 0).toLocaleString('vi-VN')} đ
                    </p>
                    <p className="text-xs text-slate-400">
                      Ngày: {p.paymentDate} | Phương thức: {p.paymentMethod || 'CASH'}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {p.status || 'COMPLETED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Liên kết tài khoản */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Liên kết tài khoản QuizMaster"
        icon={
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
            <Link2 className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        onSubmit={handleLinkAccount}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !linkInput.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Đang liên kết...' : 'Xác nhận liên kết'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300">
            Khi liên kết, học sinh có thể đăng nhập vào QuizMaster để xem lịch học, làm bài tập và nhận thông báo học phí. Toàn bộ lịch sử học tập trước đó của học sinh này vẫn sẽ được giữ nguyên 100%.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email hoặc ID tài khoản học sinh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="hocsinh@quizmaster.vn"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Chỉ được liên kết với tài khoản có vai trò Học sinh (STUDENT).
            </p>
          </div>
        </div>
      </Modal>

      {/* Modal: Sửa hồ sơ */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Chỉnh sửa thông tin học sinh"
        icon={
          <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 rounded-xl">
            <Edit className="w-5 h-5" />
          </div>
        }
        maxWidth="lg"
        onSubmit={handleUpdateStudent}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !editForm.fullName?.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Họ và tên học sinh <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editForm.fullName || ''}
              onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tên phụ huynh
              </label>
              <input
                type="text"
                value={editForm.parentName || ''}
                onChange={(e) => setEditForm({ ...editForm, parentName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại phụ huynh
              </label>
              <input
                type="tel"
                value={editForm.parentPhone || ''}
                onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày sinh
              </label>
              <input
                type="date"
                value={editForm.dob || ''}
                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giới tính
              </label>
              <select
                value={editForm.gender || 'MALE'}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    gender: e.target.value as any,
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái
              </label>
              <select
                value={editForm.status || 'ACTIVE'}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    status: e.target.value as any,
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ACTIVE">Đang học</option>
                <option value="INACTIVE">Nghỉ học</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trường học
            </label>
            <input
              type="text"
              value={editForm.school || ''}
              onChange={(e) => setEditForm({ ...editForm, school: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={editForm.note || ''}
              onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
