import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Filter,
  Download,
  Upload,
  Search,
  Calendar,
  User,
  BookOpen,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import { Modal } from '../../components/common/Modal';
import type { LearningLog, Lesson, SaveLearningLogPayload } from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useSearchParams } from 'react-router-dom';

export const TeacherLearningLogsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialLessonId = searchParams.get('lessonId') || '';
  const initialClassId = searchParams.get('classId') || 'ALL';

  const [logs, setLogs] = useState<LearningLog[]>([]);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterLessonId, setFilterLessonId] = useState<string>(initialLessonId);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LearningLog | null>(null);

  // Log Edit Form
  const [editFormData, setEditFormData] = useState<SaveLearningLogPayload>({
    lessonId: '',
    studentId: '',
    content: '',
    homework: '',
    attitude: 'Tốt',
    comment: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Excel Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);

  // Load teacher classes
  useEffect(() => {
    ClassroomService.getTeacherClasses()
      .then((data) => setClasses(data))
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Load teacher lessons for dropdown selector
  useEffect(() => {
    TeachingService.getLessons({
      classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
    })
      .then((data) => setLessons(data))
      .catch((err) => console.error('Failed to load lessons', err));
  }, [selectedClassId]);

  // Fetch logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await TeachingService.getLogs({
        month: selectedMonth || undefined,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
        lessonId: filterLessonId || undefined,
        search: searchKeyword || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch learning logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedMonth, selectedClassId, filterLessonId, searchKeyword]);

  // Open Edit / Create Log Modal
  const handleOpenEdit = (log?: LearningLog) => {
    setFormError(null);
    if (log) {
      setSelectedLog(log);
      setEditFormData({
        lessonId: log.lessonId,
        studentId: log.studentId,
        content: log.content || '',
        homework: log.homework || '',
        attitude: log.attitude || 'Tốt',
        comment: log.comment || '',
        note: log.note || '',
      });
    } else {
      setSelectedLog(null);
      const defaultLesson = lessons[0];
      const defaultStudent = defaultLesson?.participants?.[0]?.studentId || '';
      setEditFormData({
        lessonId: defaultLesson?.id || '',
        studentId: defaultStudent,
        content: '',
        homework: '',
        attitude: 'Tốt',
        comment: '',
        note: '',
      });
    }
    setIsEditModalOpen(true);
  };

  // Submit save log
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await TeachingService.saveLog(editFormData);
      setIsEditModalOpen(false);
      fetchLogs();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu nhật ký');
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const blob = await TeachingService.exportLogs({
        month: selectedMonth || undefined,
        classId: selectedClassId !== 'ALL' ? selectedClassId : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NhatKyHocTap_${selectedMonth || 'TatCa'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export logs', err);
      alert('Không thể xuất file Excel');
    }
  };

  // Import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await TeachingService.importLogs(importFile);
      setImportResult(res);
      fetchLogs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi nhập file Excel');
    } finally {
      setImporting(false);
    }
  };

  // Selected lesson for the form to find participants
  const formLesson = lessons.find((l) => l.id === editFormData.lessonId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nhật Ký Học Tập</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ghi nhận tiến độ, bài tập về nhà, ý thức học tập và nhận xét chi tiết cho từng học sinh
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Xuất Excel</span>
          </button>
          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Upload className="w-4 h-4 text-blue-500" />
            <span>Nhập Excel</span>
          </button>
          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi Nhật Ký</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm tên học sinh hoặc nội dung..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Month Filter */}
        <div className="relative">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Class Filter */}
        <div>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setFilterLessonId('');
            }}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
          >
            <option value="ALL">Tất cả lớp học</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {(searchKeyword || filterLessonId || selectedClassId !== 'ALL') && (
          <button
            onClick={() => {
              setSearchKeyword('');
              setSelectedClassId('ALL');
              setFilterLessonId('');
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Logs Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Chưa có nhật ký học tập nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Hãy bắt đầu bằng việc ghi nhật ký cho học sinh sau mỗi buổi học hoặc nhập danh sách từ file Excel.
          </p>
          <button
            onClick={() => handleOpenEdit()}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Ghi nhật ký đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4">Học Sinh</th>
                  <th className="py-3.5 px-4">Lớp & Buổi Học</th>
                  <th className="py-3.5 px-4">Nội Dung Bài Học</th>
                  <th className="py-3.5 px-4">BTVN</th>
                  <th className="py-3.5 px-4">Ý Thức</th>
                  <th className="py-3.5 px-4">Nhận Xét</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{log.student?.name}</div>
                      <div className="text-[11px] text-slate-400">{log.student?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">{log.class?.name}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        {log.lesson?.date} ({log.lesson?.title || 'Buổi học'})
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {log.content || <span className="text-slate-300 italic">Chưa ghi</span>}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {log.homework || <span className="text-slate-300 italic">Không có</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.attitude === 'Tốt'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : log.attitude === 'Khá'
                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {log.attitude || 'Tốt'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {log.comment || <span className="text-slate-300 italic">-</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(log)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Chỉnh sửa nhật ký"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT / CREATE LOG MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={selectedLog ? 'Cập Nhật Nhật Ký Học Tập' : 'Ghi Nhật Ký Học Tập'}
        icon={
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        }
        maxWidth="lg"
        onSubmit={handleSaveLog}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Đang lưu...' : 'Lưu Nhật Ký'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-xl text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {!selectedLog && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Buổi Học <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.lessonId}
                  onChange={(e) => setEditFormData({ ...editFormData, lessonId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.date} - {l.title} ({l.class?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Học Sinh <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormData.studentId}
                  onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {formLesson?.participants?.map((p) => (
                    <option key={p.studentId} value={p.studentId}>
                      {p.student?.name} ({p.student?.email})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung bài học
            </label>
            <textarea
              rows={2}
              value={editFormData.content}
              onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
              placeholder="VD: Ôn tập phương trình bậc hai, cách lập bảng biến thiên..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              BTVN giao về
            </label>
            <input
              type="text"
              value={editFormData.homework}
              onChange={(e) => setEditFormData({ ...editFormData, homework: e.target.value })}
              placeholder="VD: Bài 1 đến bài 10 trang 45 SGK"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ý thức học tập
            </label>
            <select
              value={editFormData.attitude}
              onChange={(e) => setEditFormData({ ...editFormData, attitude: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="Tốt">Tốt</option>
              <option value="Khá">Khá</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Cần cố gắng">Cần cố gắng</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nhận xét của giáo viên
            </label>
            <textarea
              rows={2}
              value={editFormData.comment}
              onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
              placeholder="VD: Nắm bài tốt, tính toán nhanh và chính xác."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* IMPORT EXCEL MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập Nhật Ký Từ Excel"
        icon={
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        onSubmit={handleImportExcel}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={!importFile || importing}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {importing ? 'Đang xử lý...' : 'Tải lên & Nhập'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer">
              <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {importFile ? importFile.name : 'Chọn file Excel (.xlsx)'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Cột: Email, Ngày học, Nội dung, BTVN, Ý thức, Nhận xét</p>
            </label>
          </div>

          {importResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ Đã nhập thành công: {importResult.successCount} bản ghi
              </div>
              {importResult.errors.length > 0 && (
                <div className="text-red-500 text-[11px]">
                  {importResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
