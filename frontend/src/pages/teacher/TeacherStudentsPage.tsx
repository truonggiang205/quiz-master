import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentService } from '../../services/student.service';
import { TeacherStudent, CreateExternalStudentPayload } from '../../types/student';
import {
  UserPlus,
  Mail,
  UserMinus,
  Search,
  GraduationCap,
  Phone,
  School,
  ChevronRight,
  Link2,
  Users,
  UserCheck,
  UserX,
  FileText,
} from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { withNotification } from '../../utils/notification.util';
import { Modal } from '../../components/common/Modal';
import { UserAvatar } from '../../components/common/UserAvatar';

export const TeacherStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EXTERNAL' | 'LINKED'>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTab, setModalTab] = useState<'EXTERNAL' | 'INVITE'>('EXTERNAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for External Student
  const [externalForm, setExternalForm] = useState<CreateExternalStudentPayload>({
    fullName: '',
    phone: '',
    email: '',
    parentName: '',
    parentPhone: '',
    dob: '',
    gender: 'MALE',
    school: '',
    note: '',
  });

  // Form State for Email Invite
  const [inviteEmail, setInviteEmail] = useState('');

  const { addToast, confirm } = useUiStore();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await StudentService.getMyStudents();
      setStudents(data);
    } catch {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể tải danh sách học sinh' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateExternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalForm.fullName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const studentName = externalForm.fullName.trim();

    try {
      await withNotification(
        {
          actionKey: `create-external-student-${Date.now()}`,
          loadingTitle: 'Đang tạo hồ sơ...',
          loadingMessage: `Đang lưu học sinh ${studentName} ngoài hệ thống`,
          successTitle: 'Thành công',
          successMessage: `Đã thêm học sinh ${studentName} vào danh bạ`,
          errorTitle: 'Lỗi thêm học sinh',
        },
        async () => {
          const newStudent = await StudentService.createExternalStudent({
            ...externalForm,
            fullName: studentName,
          });
          setStudents((prev) => [newStudent, ...prev]);
          setShowAddModal(false);
          setExternalForm({
            fullName: '',
            phone: '',
            email: '',
            parentName: '',
            parentPhone: '',
            dob: '',
            gender: 'MALE',
            school: '',
            note: '',
          });
        }
      );
    } catch {
      // Handled by withNotification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || isSubmitting) return;
    const emailToInvite = inviteEmail.trim();

    setIsSubmitting(true);
    try {
      await withNotification(
        {
          actionKey: `invite-student-${emailToInvite}`,
          loadingTitle: 'Đang gửi lời mời...',
          loadingMessage: `Đang gửi email mời tới ${emailToInvite}`,
          successTitle: 'Thành công',
          successMessage: `Đã gửi lời mời đến ${emailToInvite}`,
          errorTitle: 'Lỗi gửi lời mời',
        },
        async () => {
          await StudentService.inviteStudent(emailToInvite);
          setShowAddModal(false);
          setInviteEmail('');
        }
      );
    } catch {
      // Handled by withNotification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Xóa học sinh',
      description: `Bạn có chắc chắn muốn xóa học sinh ${studentName} khỏi danh bạ? Toàn bộ lịch sử liên quan sẽ được ẩn.`,
      variant: 'danger',
      confirmText: 'Xóa học sinh',
    });
    if (!confirmed) return;

    try {
      await withNotification(
        {
          actionKey: `remove-student-${studentId}`,
          loadingTitle: 'Đang xóa học sinh...',
          successTitle: 'Thành công',
          successMessage: `Đã xóa học sinh ${studentName}`,
          errorTitle: 'Lỗi',
          errorMessage: 'Không thể xóa học sinh',
        },
        async () => {
          await StudentService.deleteStudent(studentId);
          setStudents((prev) => prev.filter((s) => s.id !== studentId));
        }
      );
    } catch {
      // Handled by withNotification
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = s.fullName || s.name || '';
      const email = s.email || s.studentAccount?.email || '';
      const phone = s.phone || '';
      const school = s.school || '';

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        phone.includes(query) ||
        school.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (statusFilter === 'EXTERNAL') return s.isExternal;
      if (statusFilter === 'LINKED') return !s.isExternal;
      return true;
    });
  }, [students, searchQuery, statusFilter]);

  const externalCount = students.filter((s) => s.isExternal).length;
  const linkedCount = students.filter((s) => !s.isExternal).length;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-sky-600 dark:text-sky-400" />
            Hồ sơ & Danh bạ Học sinh
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Quản lý toàn diện học sinh ngoài hệ thống và học sinh liên kết QuizMaster
          </p>
        </div>

        <button
          onClick={() => {
            setModalTab('EXTERNAL');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl transition-all font-semibold shadow-sm shadow-sky-200 dark:shadow-none active:scale-[0.98]"
        >
          <UserPlus className="w-5 h-5" />
          + Thêm học sinh
        </button>
      </div>

      {/* Stats KPI bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng học sinh</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{students.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ngoài hệ thống</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{externalCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Có tài khoản</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{linkedCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, số điện thoại, trường học..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Tất cả ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter('EXTERNAL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'EXTERNAL'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Ngoài hệ thống ({externalCount})
          </button>
          <button
            onClick={() => setStatusFilter('LINKED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'LINKED'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Có tài khoản ({linkedCount})
          </button>
        </div>
      </div>

      {/* Main Student List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center shadow-xs border border-slate-100 dark:border-slate-800">
          <div className="w-20 h-20 bg-sky-50 dark:bg-sky-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-10 h-10 text-sky-500 dark:text-sky-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            {searchQuery ? 'Không tìm thấy học sinh nào' : 'Chưa có học sinh nào'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto text-sm">
            {searchQuery
              ? 'Thử điều chỉnh từ khóa tìm kiếm hoặc bộ lọc trạng thái.'
              : 'Thêm học sinh ngoài hệ thống để quản lý lịch dạy kèm 1-1, điểm danh, nhật ký học tập và học phí.'}
          </p>
          <button
            onClick={() => {
              setModalTab('EXTERNAL');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            + Thêm học sinh ngay
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Danh sách hiển thị ({filteredStudents.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => {
              const studentDisplayName = student.fullName || student.name || 'Học sinh';
              const displayEmail = student.email || student.studentAccount?.email;

              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/teacher/students/${student.id}`)}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <UserAvatar
                      src={student.avatar || student.studentAccount?.avatar}
                      name={studentDisplayName}
                      size="header"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                          {studentDisplayName}
                        </p>

                        {/* Status Badges */}
                        {student.isExternal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                            NGOÀI HỆ THỐNG
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            <Link2 className="w-3 h-3" /> CÓ TÀI KHOẢN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        {displayEmail ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {displayEmail}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa liên kết email</span>
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/teacher/students/${student.id}`);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Hồ sơ & Lịch sử
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => handleRemoveStudent(student.id, studentDisplayName, e)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Xóa khỏi danh bạ"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: + Thêm học sinh (Tab Học sinh ngoài hệ thống & Mời học sinh có tài khoản) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="+ Thêm học sinh vào danh bạ"
        icon={
          <div className="p-2 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
            <UserPlus className="w-5 h-5" />
          </div>
        }
        maxWidth="lg"
        onSubmit={modalTab === 'EXTERNAL' ? handleCreateExternalSubmit : handleInviteSubmit}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (modalTab === 'EXTERNAL' ? !externalForm.fullName.trim() : !inviteEmail.trim())}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting
                ? 'Đang xử lý...'
                : modalTab === 'EXTERNAL'
                ? 'Tạo học sinh ngoài hệ thống'
                : 'Gửi lời mời'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tabs Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => setModalTab('EXTERNAL')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                modalTab === 'EXTERNAL'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserX className="w-4 h-4" />
              Học sinh ngoài hệ thống
            </button>
            <button
              type="button"
              onClick={() => setModalTab('INVITE')}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                modalTab === 'INVITE'
                  ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              Mời học sinh có tài khoản
            </button>
          </div>

          {modalTab === 'EXTERNAL' ? (
            <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                <strong>Học sinh ngoài hệ thống:</strong> Không yêu cầu email/mật khẩu. Bạn có thể lên lịch dạy kèm, tính học phí, điểm danh và ghi nhận xét ngay lập tức. Sau này có thể liên kết tài khoản QuizMaster nếu học sinh đăng ký.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={externalForm.fullName}
                  onChange={(e) => setExternalForm({ ...externalForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại học sinh
                  </label>
                  <input
                    type="tel"
                    value={externalForm.phone || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email liên hệ (nếu có)
                  </label>
                  <input
                    type="email"
                    value={externalForm.email || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, email: e.target.value })}
                    placeholder="hocsinh@gmail.com"
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
                    value={externalForm.parentName || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, parentName: e.target.value })}
                    placeholder="Ví dụ: Bác Thành"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại phụ huynh
                  </label>
                  <input
                    type="tel"
                    value={externalForm.parentPhone || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, parentPhone: e.target.value })}
                    placeholder="0987 654 321"
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
                    value={externalForm.dob || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, dob: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Giới tính
                  </label>
                  <select
                    value={externalForm.gender || 'MALE'}
                    onChange={(e) =>
                      setExternalForm({
                        ...externalForm,
                        gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER',
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
                    Trường học
                  </label>
                  <input
                    type="text"
                    value={externalForm.school || ''}
                    onChange={(e) => setExternalForm({ ...externalForm, school: e.target.value })}
                    placeholder="THPT / THCS..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú học tập / Mục tiêu
                </label>
                <textarea
                  rows={2}
                  value={externalForm.note || ''}
                  onChange={(e) => setExternalForm({ ...externalForm, note: e.target.value })}
                  placeholder="Ví dụ: Kèm nâng cao chuyên Toán, mục tiêu thi vào 10..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi email lời mời tới học sinh đã có hoặc chuẩn bị đăng ký tài khoản QuizMaster.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Địa chỉ Email học sinh <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="hocsinh@example.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
