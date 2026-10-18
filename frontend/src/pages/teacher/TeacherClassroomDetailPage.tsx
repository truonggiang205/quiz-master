import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ClassroomService } from '../../services/classroom.service';
import { Classroom, ClassStudent, ImportStudentResult } from '../../types/classroom';
import {
  ArrowLeft,
  Users,
  UserMinus,
  FileQuestion,
  GraduationCap,
  Copy,
  Check,
  Download,
  Upload,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  TrendingUp,
  BarChart2,
  FileSpreadsheet,
  RefreshCw,
  X,
  FileCheck,
  ShieldAlert,
  BookOpen,
} from 'lucide-react';
import { useUiStore } from '../../stores/ui.store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';

const SCORE_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981'];

export const TeacherClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportStudentResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excel Export State
  const [isExporting, setIsExporting] = useState(false);

  // Error 403 Forbidden State
  const [isForbidden, setIsForbidden] = useState(false);

  const { addToast, confirm } = useUiStore();

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (classId: string) => {
    setIsLoading(true);
    setIsForbidden(false);
    try {
      const [classData, studentList] = await Promise.all([
        ClassroomService.getClassDetails(classId),
        ClassroomService.getClassStudents(classId),
      ]);
      setClassroom(classData);
      setStudents(studentList);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setIsForbidden(true);
        addToast({
          type: 'error',
          title: 'Từ chối truy cập (403)',
          message: 'Bạn không có quyền quản lý lớp học này.',
        });
      } else {
        addToast({
          type: 'error',
          title: 'Lỗi',
          message: 'Không thể tải chi tiết lớp học.',
        });
        navigate('/teacher/classes');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStudents = async () => {
    if (!id) return;
    setIsLoadingStudents(true);
    try {
      const studentList = await ClassroomService.getClassStudents(id, {
        search: searchQuery || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      setStudents(studentList);
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi cập nhật danh sách học sinh' });
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Trigger student refresh on filter change
  useEffect(() => {
    if (id && !isLoading) {
      refreshStudents();
    }
  }, [searchQuery, statusFilter]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    addToast({ type: 'info', title: `Đã sao chép mã: ${code}` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: 'Xóa học sinh khỏi lớp',
      description: `Bạn có chắc chắn muốn xóa học sinh "${studentName}" khỏi lớp này không?`,
      variant: 'danger',
      confirmText: 'Xác nhận xóa',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;

    try {
      await ClassroomService.removeStudent(id, studentId);
      addToast({
        type: 'success',
        title: 'Thành công',
        message: `Đã xóa học sinh ${studentName} khỏi lớp.`,
      });
      // If private 1-1 class, return to classes list
      if (classroom?.isPrivate) {
        navigate('/teacher/classes');
      } else {
        loadData(id);
      }
    } catch {
      addToast({ type: 'error', title: 'Lỗi', message: 'Không thể xóa học sinh' });
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      const blob = await ClassroomService.exportStudents(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (classroom?.name || 'Lop_hoc').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
      a.download = `Danh_sach_hoc_sinh_${cleanName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast({
        type: 'success',
        title: 'Xuất Excel thành công',
        message: 'File danh sách học sinh đã được tải về máy của bạn.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Xuất file thất bại',
        message: err?.response?.data?.message || 'Không thể tạo file Excel.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    try {
      const sampleRows = [
        {
          'Họ và tên': 'Nguyễn Văn An',
          Email: 'nguyenvanan.student@gmail.com',
          'Username/MSSV': 'nguyenvanan',
          'Số điện thoại': '0912345678',
        },
        {
          'Họ và tên': 'Trần Thị Bình',
          Email: 'tranthibinh.student@gmail.com',
          'Username/MSSV': 'tranthibinh',
          'Số điện thoại': '0987654321',
        },
        {
          'Họ và tên': 'Lê Hoàng Cường',
          Email: 'lehoangcuong.student@gmail.com',
          'Username/MSSV': 'lehoangcuong',
          'Số điện thoại': '0901234567',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      // Auto column widths
      worksheet['!cols'] = [
        { wch: 22 },
        { wch: 32 },
        { wch: 20 },
        { wch: 16 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Mau_Hoc_Sinh');
      XLSX.writeFile(workbook, 'Mau_danh_sach_hoc_sinh.xlsx');

      addToast({
        type: 'success',
        title: 'Đã tải mẫu Excel',
        message: 'Vui lòng điền thông tin học sinh theo mẫu vừa tải.',
      });
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi tạo file mẫu' });
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        addToast({
          type: 'error',
          title: 'Định dạng file không hỗ trợ',
          message: 'Vui lòng tải lên file Excel (.xlsx hoặc .xls).',
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  // Handle Import Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFile) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await ClassroomService.importStudents(id, selectedFile);
      setImportResult(result);

      if (result.successCount > 0) {
        addToast({
          type: 'success',
          title: 'Nhập học sinh thành công',
          message: `Đã thêm thành công ${result.successCount} học sinh vào lớp.`,
        });
        // Refresh class data and roster
        loadData(id);
      } else {
        addToast({
          type: 'warning',
          title: 'Không có học sinh nào được thêm',
          message: 'Vui lòng kiểm tra danh sách lỗi bên dưới.',
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lỗi khi import file',
        message: err?.response?.data?.message || 'Có lỗi xảy ra trong quá trình xử lý file.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculations for KPI Cards
  const stats = classroom?.stats;
  const totalStudents = stats?.totalStudents ?? students.length;
  const activeStudents = stats?.activeStudents ?? students.filter((s) => s.isActive).length;
  const inactiveStudents = stats?.inactiveStudents ?? students.filter((s) => !s.isActive).length;
  const quizCount = stats?.quizCount ?? 0;
  const avgScore = stats?.avgScore && stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-';
  const completionRate = stats?.completionRate ?? 0;

  // Chart Data preparation
  const scoreDistData = useMemo(() => {
    return stats?.scoreDistribution ?? [];
  }, [stats]);

  const hasScoreDistData = scoreDistData.some((d) => d.count > 0);

  const recentQuizData = useMemo(() => {
    if (!stats?.recentQuizScores || stats.recentQuizScores.length === 0) return [];
    return stats.recentQuizScores.map((q) => ({
      title: q.title.length > 15 ? q.title.slice(0, 15) + '...' : q.title,
      fullTitle: q.title,
      score: q.avgScore,
      submissions: q.totalAttempts,
    }));
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
        <span className="text-sm text-slate-400">Đang tải thông tin lớp học...</span>
      </div>
    );
  }

  // 403 Forbidden State
  if (isForbidden) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">
          Từ Chối Quyền Truy Cập (403)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Bạn không có quyền quản lý hoặc xem thông tin của lớp học này. Vui lòng chỉ truy cập các lớp học do bạn trực tiếp giảng dạy.
        </p>
        <Link
          to="/teacher/classes"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Về danh sách lớp của tôi
        </Link>
      </div>
    );
  }

  if (!classroom) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            to="/teacher/classes"
            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            title="Quay lại danh sách lớp"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {classroom.name}
              </h1>
              {classroom.inviteCode && (
                <div className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800 px-2.5 py-1 rounded-lg">
                  <span className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">
                    MÃ:
                  </span>
                  <code className="text-xs font-mono font-bold text-sky-700 dark:text-sky-300">
                    {classroom.inviteCode}
                  </code>
                  <button
                    onClick={() => handleCopyCode(classroom.inviteCode)}
                    className="text-slate-400 hover:text-sky-600 p-0.5 ml-0.5"
                    title="Sao chép mã lớp"
                  >
                    {copiedCode === classroom.inviteCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {classroom.subject || 'Chưa phân môn'}
              </span>
              &bull;
              <span>{classroom.isPrivate ? 'Lớp kèm 1-1' : 'Lớp học nhóm'}</span>
              &bull;
              <span>{totalStudents} học sinh</span>
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {!classroom.isPrivate && (
            <button
              onClick={() => setShowImportModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              Nhập Excel
            </button>
          )}

          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        </div>
      </div>

      {/* KPI Statistics Row (6 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-sky-500" />
            Tổng HS
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalStudents}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Sĩ số lớp</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Hoạt động
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {activeStudents}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tài khoản hoạt động</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <XCircle className="w-4 h-4 text-slate-400" />
            Chưa kích hoạt
          </div>
          <div className="text-2xl font-black text-slate-500 dark:text-slate-400">
            {inactiveStudents}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Chưa active</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileQuestion className="w-4 h-4 text-indigo-500" />
            Bài kiểm tra
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {quizCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Đã phân phối</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            Điểm TB
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {avgScore}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Thang điểm 10</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Tỷ lệ nộp
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {completionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mức độ hoàn thành</div>
        </div>
      </div>

      {/* Visual Statistics Section (2 Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Score Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-sky-500" />
                Phân Bố Điểm Số Toàn Lớp
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Thống kê số lượng học sinh theo từng khoảng điểm kiểm tra
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {hasScoreDistData ? 'Dữ liệu thực' : 'Chưa có điểm'}
            </span>
          </div>

          {hasScoreDistData ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={scoreDistData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} học sinh`, 'Số lượng']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {scoreDistData.map((_, index) => (
                      <Cell
                        key={`dist-${index}`}
                        fill={SCORE_COLORS[index % SCORE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <BarChart2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-medium">Chưa có bài thi nào được hoàn thành</p>
              <p className="text-xs text-slate-400 mt-1">
                Biểu đồ sẽ tự động hiển thị khi học sinh nộp bài kiểm tra.
              </p>
            </div>
          )}
        </div>

        {/* Chart 2: Recent Quiz Score Trends */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Điểm TB Các Bài Thi Gần Nhất
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Xu hướng điểm số trung bình qua các đề kiểm tra
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {recentQuizData.length > 0 ? `${recentQuizData.length} bài thi` : 'Chưa có'}
            </span>
          </div>

          {recentQuizData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={recentQuizData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(val, _name, item) => [
                      `${val} điểm (${item.payload.submissions} lượt)`,
                      item.payload.fullTitle,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              {/* Quiz list pills */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 max-h-36 overflow-y-auto">
                {recentQuizData.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                  >
                    <span
                      className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]"
                      title={q.fullTitle}
                    >
                      {q.fullTitle}
                    </span>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        {q.submissions} lượt làm
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {q.score > 0 ? `${q.score}/10` : 'Chưa có điểm'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-medium">Chưa có bài thi nào được giao</p>
              <p className="text-xs text-slate-400 mt-1">
                Tạo bài kiểm tra và giao cho lớp để theo dõi tiến độ điểm số.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Student List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Section Header & Search/Filter Toolbar */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                Danh Sách Học Sinh
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                  {students.length} học sinh
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quản lý thành viên, tìm kiếm và kiểm soát trạng thái học sinh trong lớp
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshStudents}
                disabled={isLoadingStudents}
                className="p-2 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                title="Làm mới danh sách"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingStudents ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên, email, username/MSSV, SĐT..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Tất cả ({totalStudents})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Đang hoạt động ({activeStudents})
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'INACTIVE'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Chưa hoạt động ({inactiveStudents})
              </button>
            </div>
          </div>
        </div>

        {/* Responsive Student Table */}
        <div className="overflow-x-auto">
          {isLoadingStudents ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            </div>
          ) : students.length > 0 ? (
            <div className="min-w-[760px]">
              {/* Header row */}
              <div className="grid grid-cols-12 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 py-3.5 px-4 border-b border-slate-100 dark:border-slate-800">
                <div className="col-span-1 text-center">STT</div>
                <div className="col-span-3">Họ và Tên</div>
                <div className="col-span-3">Email</div>
                <div className="col-span-2">Username / MSSV</div>
                <div className="col-span-1 text-center">Trạng Thái</div>
                <div className="col-span-1 text-center">Tham gia</div>
                <div className="col-span-1 text-right">Thao Tác</div>
              </div>

              {/* Student list UL/LI */}
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {students.map((student, idx) => {
                  const joinedDate = student.createdAt
                    ? new Date(student.createdAt).toLocaleDateString('vi-VN')
                    : '-';

                  return (
                    <li
                      key={student.id}
                      className="grid grid-cols-12 items-center py-3.5 px-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="col-span-1 text-center text-xs font-semibold text-slate-400">
                        {idx + 1}
                      </div>
                      <div className="col-span-3 flex items-center gap-3 pr-2">
                        <img
                          src={
                            student.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              student.name || 'Student'
                            )}&background=0284c7&color=fff`
                          }
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {student.name}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                            {student.avgScore !== undefined && student.avgScore !== null ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Điểm TB: {student.avgScore}/10 ({student.submissionsCount || 0} bài)
                              </span>
                            ) : (
                              <span>Chưa có bài thi</span>
                            )}
                            {student.phone && <span>• SĐT: {student.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3 text-slate-600 dark:text-slate-300 font-medium truncate pr-2">
                        {student.email}
                      </div>
                      <div className="col-span-2">
                        <code className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate block w-fit">
                          {student.username || student.id.slice(0, 8)}
                        </code>
                      </div>
                      <div className="col-span-1 text-center">
                        {student.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="col-span-1 text-xs text-slate-500 dark:text-slate-400 text-center">
                        {joinedDate}
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => handleRemoveStudent(student.id, student.name)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                          title="Xóa khỏi lớp"
                        >
                          <UserMinus className="w-4 h-4" />
                          <span className="hidden sm:inline">Xóa</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="p-14 text-center">
              <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Không tìm thấy học sinh phù hợp'
                  : 'Lớp này chưa có học sinh nào'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Hãy thử thay đổi tiêu chí tìm kiếm hoặc xóa bộ lọc trạng thái.'
                  : `Chia sẻ mã mời "${classroom.inviteCode}" hoặc tải lên file Excel để thêm học sinh.`}
              </p>
              {!searchQuery && statusFilter === 'ALL' && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-500/20"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Nhập học sinh từ Excel ngay
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thông tin chung card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-base font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-sky-600" />
          Thông tin chung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">Mô tả lớp học</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {classroom.description || 'Không có mô tả chi tiết'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-slate-400 block font-semibold mb-1">Môn học & Hình thức</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {classroom.subject || 'Chưa phân môn'} &bull; {classroom.isPrivate ? 'Kèm 1-1' : 'Lớp học nhóm'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block font-semibold mb-1">Đề kiểm tra ôn luyện</span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {quizCount} bài thi khả dụng
              </p>
            </div>
            <Link
              to="/teacher/quizzes/create"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg font-bold transition-colors"
            >
              <FileQuestion className="w-3.5 h-3.5" />
              Tạo đề
            </Link>
          </div>
        </div>
      </div>

      {/* Import Excel Modal */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeImportModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 my-8"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">
                    Nhập Danh Sách Học Sinh Từ Excel
                  </h3>
                </div>
                <button
                  onClick={closeImportModal}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Download sample template banner */}
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <p className="font-bold text-sky-800 dark:text-sky-200">
                      Chưa có mẫu file Excel?
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      Định dạng chuẩn: Họ tên, Email, Username, SĐT
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải file mẫu
                  </button>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleImportSubmit} className="space-y-4">
                  {/* File Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      selectedFile
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-600 bg-slate-50/50 dark:bg-slate-800/40'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                        <div className="text-left truncate">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB &bull; Bấm để đổi file khác
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          Bấm vào đây để chọn file Excel
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Hỗ trợ định dạng .xlsx, .xls (tối đa 5MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Import Results Box */}
                  {importResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Kết Quả Nhập Dữ Liệu
                      </h4>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                          <p className="text-[10px] text-emerald-600 font-bold uppercase">
                            Thành công
                          </p>
                          <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                            {importResult.successCount}
                          </p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-950/60 p-2 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                          <p className="text-[10px] text-amber-600 font-bold uppercase">
                            Bỏ qua
                          </p>
                          <p className="text-lg font-black text-amber-700 dark:text-amber-400">
                            {importResult.skippedCount}
                          </p>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-950/60 p-2 rounded-xl border border-rose-200/50 dark:border-rose-800/50">
                          <p className="text-[10px] text-rose-600 font-bold uppercase">Lỗi</p>
                          <p className="text-lg font-black text-rose-700 dark:text-rose-400">
                            {importResult.errorCount ?? importResult.errors?.length ?? 0}
                          </p>
                        </div>
                      </div>

                      {/* Error details list */}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Chi tiết các dòng bị lỗi / bỏ qua:
                          </p>
                          {importResult.errors.map((err, i) => (
                            <div
                              key={i}
                              className="text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-rose-100 dark:border-rose-950 text-slate-700 dark:text-slate-300 flex items-start gap-2"
                            >
                              <span className="font-bold text-rose-500 shrink-0">
                                Dòng {err.row}:
                              </span>
                              <span>{err.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={closeImportModal}
                      className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors text-sm"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedFile || isImporting}
                      className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all text-sm shadow-md shadow-sky-500/20"
                    >
                      {isImporting ? 'Đang xử lý...' : 'Bắt đầu Nhập'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
