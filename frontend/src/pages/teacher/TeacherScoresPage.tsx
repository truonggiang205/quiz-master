import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Plus,
  Filter,
  Download,
  Upload,
  Calendar,
  User,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Layers,
  List,
} from 'lucide-react';
import { TeachingService } from '../../services/teaching.service';
import { ClassroomService } from '../../services/classroom.service';
import { Modal } from '../../components/common/Modal';
import type {
  ScoreRecord,
  ScoreMatrixResponse,
  Lesson,
  AssessmentType,
} from '../../types/teaching';
import type { Classroom } from '../../types/classroom';
import { useSearchParams } from 'react-router-dom';

export const TeacherScoresPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get('classId') || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [viewTab, setViewTab] = useState<'MATRIX' | 'LIST'>('MATRIX');
  const [loading, setLoading] = useState(true);

  // Data states
  const [matrixData, setMatrixData] = useState<ScoreMatrixResponse | null>(null);
  const [scoresList, setScoresList] = useState<ScoreRecord[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<ScoreRecord | null>(null);

  // Form State
  const [scoreForm, setScoreForm] = useState({
    classId: '',
    studentId: '',
    lessonId: initialLessonId || '',
    assessmentType: 'QUIZ' as AssessmentType,
    assessmentName: '',
    score: 8,
    maxScore: 10,
    date: new Date().toISOString().substring(0, 10),
    comment: '',
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
      .then((data) => {
        setClasses(data);
        if (data.length > 0 && !selectedClassId) {
          setSelectedClassId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // When selectedClassId changes, load class lessons
  useEffect(() => {
    if (selectedClassId) {
      TeachingService.getLessons({ classId: selectedClassId })
        .then((data) => setLessons(data))
        .catch((err) => console.error('Failed to load lessons', err));
    }
  }, [selectedClassId]);

  // Fetch Matrix & List Data
  const fetchScoresData = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      if (viewTab === 'MATRIX') {
        const matrix = await TeachingService.getClassScoreMatrix(selectedClassId);
        setMatrixData(matrix);
      } else {
        const list = await TeachingService.getScores({ classId: selectedClassId });
        setScoresList(list);
      }
    } catch (err) {
      console.error('Failed to fetch scores', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoresData();
  }, [selectedClassId, viewTab]);

  // Selected class object to get student list for Form
  const currentClassObj = classes.find((c) => c.id === (scoreForm.classId || selectedClassId));

  // Open Add Score Modal
  const handleOpenAdd = () => {
    setFormError(null);
    const targetClassId = selectedClassId || (classes[0]?.id || '');
    const cls = classes.find((c) => c.id === targetClassId);
    const defaultStudent = cls?.students?.[0]?.id || '';

    setScoreForm({
      classId: targetClassId,
      studentId: defaultStudent,
      lessonId: initialLessonId || '',
      assessmentType: 'QUIZ',
      assessmentName: '',
      score: 8,
      maxScore: 10,
      date: new Date().toISOString().substring(0, 10),
      comment: '',
    });
    setIsAddModalOpen(true);
  };

  // Submit Add Score
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (scoreForm.score < 0 || scoreForm.score > scoreForm.maxScore) {
      setFormError(`Điểm số phải từ 0 đến ${scoreForm.maxScore}`);
      return;
    }

    setSubmitting(true);
    try {
      await TeachingService.createScore({
        ...scoreForm,
        lessonId: scoreForm.lessonId || null,
        score: Number(scoreForm.score),
        maxScore: Number(scoreForm.maxScore),
      });
      setIsAddModalOpen(false);
      fetchScoresData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi nhập điểm');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Score Modal
  const handleOpenEdit = (sc: ScoreRecord) => {
    setEditingScore(sc);
    setFormError(null);
    setScoreForm({
      classId: sc.classId,
      studentId: sc.studentId,
      lessonId: sc.lessonId || '',
      assessmentType: sc.assessmentType,
      assessmentName: sc.assessmentName,
      score: sc.score,
      maxScore: sc.maxScore,
      date: sc.date,
      comment: sc.comment || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Score
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingScore) return;
    setFormError(null);

    if (scoreForm.score < 0 || scoreForm.score > scoreForm.maxScore) {
      setFormError(`Điểm số phải từ 0 đến ${scoreForm.maxScore}`);
      return;
    }

    setSubmitting(true);
    try {
      await TeachingService.updateScore(editingScore.id, {
        assessmentType: scoreForm.assessmentType,
        assessmentName: scoreForm.assessmentName,
        score: Number(scoreForm.score),
        maxScore: Number(scoreForm.maxScore),
        date: scoreForm.date,
        comment: scoreForm.comment,
      });
      setIsEditModalOpen(false);
      fetchScoresData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật điểm');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Score
  const handleDeleteScore = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa điểm này?')) return;
    try {
      await TeachingService.deleteScore(id);
      fetchScoresData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa điểm');
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const blob = await TeachingService.exportScores({ classId: selectedClassId });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BangDiem_${currentClassObj?.name || 'Class'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export scores', err);
      alert('Không thể xuất file Excel');
    }
  };

  // Import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !selectedClassId) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await TeachingService.importScores(selectedClassId, importFile);
      setImportResult(res);
      fetchScoresData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi nhập file Excel');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản Lý Điểm Số</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nhập điểm đánh giá thường xuyên, kiểm tra định kỳ, thi giữa kỳ & bảng điểm tổng hợp
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
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-sm shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nhập Điểm Mới</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Class Filter & View Mode Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp học:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.students?.length || 0} học sinh)
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle: Matrix vs List */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
          <button
            onClick={() => setViewTab('MATRIX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === 'MATRIX'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Bảng ma trận lớp
          </button>
          <button
            onClick={() => setViewTab('LIST')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewTab === 'LIST'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Danh sách chi tiết
          </button>
        </div>
      </div>

      {/* MATRIX VIEW */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : viewTab === 'MATRIX' ? (
        matrixData && matrixData.students.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                Lớp: <strong className="text-slate-900 dark:text-white">{matrixData.className}</strong>
              </span>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Điểm TB chung cả lớp: {matrixData.classAverage} / 10
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-4">Học Sinh</th>
                    {matrixData.assessments.map((ass) => (
                      <th key={ass.key} className="py-3.5 px-4 text-center">
                        <span className="block text-slate-700 dark:text-slate-300 font-bold">{ass.name}</span>
                        <span className="text-[10px] text-slate-400 lowercase">({ass.type})</span>
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-center bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400">
                      Điểm TB (hệ 10)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {matrixData.students.map((st) => (
                    <tr key={st.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {st.studentName}
                        <div className="text-[10px] text-slate-400 font-normal">{st.studentEmail}</div>
                      </td>
                      {matrixData.assessments.map((ass) => {
                        const scoreItem = st.scores[ass.key];
                        return (
                          <td key={ass.key} className="py-3 px-4 text-center">
                            {scoreItem ? (
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {scoreItem.score}
                                <span className="text-[10px] text-slate-400">/{scoreItem.maxScore}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-center font-bold text-amber-600 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10">
                        {st.totalAssessments > 0 ? st.averageScore : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <Award className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Lớp chưa có đầu điểm nào</h3>
            <p className="text-xs text-slate-400 mt-1">Hãy nhấn "Nhập Điểm Mới" để bắt đầu ghi điểm cho học sinh.</p>
          </div>
        )
      ) : (
        /* LIST VIEW */
        scoresList.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3.5 px-4">Ngày</th>
                    <th className="py-3.5 px-4">Học Sinh</th>
                    <th className="py-3.5 px-4">Tên Bài Đánh Giá</th>
                    <th className="py-3.5 px-4">Loại</th>
                    <th className="py-3.5 px-4 text-center">Điểm Đạt Được</th>
                    <th className="py-3.5 px-4">Nhận Xét</th>
                    <th className="py-3.5 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {scoresList.map((sc) => (
                    <tr key={sc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{sc.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{sc.student?.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {sc.assessmentName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                          {sc.assessmentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-base text-amber-600 dark:text-amber-400">
                        {sc.score} <span className="text-xs text-slate-400 font-normal">/ {sc.maxScore}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{sc.comment || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(sc)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-slate-100"
                            title="Sửa điểm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteScore(sc.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                            title="Xóa điểm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800">
            <Award className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Không có bản ghi điểm nào</h3>
          </div>
        )
      )}

      {/* ADD / EDIT SCORE MODAL */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Cập Nhật Điểm Số' : 'Nhập Điểm Cho Học Sinh'}
        icon={
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        }
        maxWidth="md"
        onSubmit={isEditModalOpen ? handleSubmitEdit : handleSubmitAdd}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? 'Đang lưu...' : 'Lưu Điểm'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {!isEditModalOpen && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Học sinh <span className="text-red-500">*</span>
              </label>
              <select
                value={scoreForm.studentId}
                onChange={(e) => setScoreForm({ ...scoreForm, studentId: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {currentClassObj?.students?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loại đánh giá <span className="text-red-500">*</span>
              </label>
              <select
                value={scoreForm.assessmentType}
                onChange={(e) => setScoreForm({ ...scoreForm, assessmentType: e.target.value as AssessmentType })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
              >
                <option value="QUIZ">Kiểm tra 15p / Quiz</option>
                <option value="HOMEWORK">Bài tập về nhà</option>
                <option value="MIDTERM">Giữa kỳ</option>
                <option value="FINAL">Cuối kỳ</option>
                <option value="ORAL">Vấn đáp</option>
                <option value="PRACTICE">Thực hành</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày chấm <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={scoreForm.date}
                onChange={(e) => setScoreForm({ ...scoreForm, date: e.target.value })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên bài kiểm tra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={scoreForm.assessmentName}
              onChange={(e) => setScoreForm({ ...scoreForm, assessmentName: e.target.value })}
              placeholder="VD: Kiểm tra 15 phút Số Phức"
              required
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Điểm đạt được <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max={scoreForm.maxScore}
                value={scoreForm.score}
                onChange={(e) => setScoreForm({ ...scoreForm, score: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-amber-600 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Thang điểm tối đa
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={scoreForm.maxScore}
                onChange={(e) => setScoreForm({ ...scoreForm, maxScore: Number(e.target.value) })}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nhận xét
            </label>
            <input
              type="text"
              value={scoreForm.comment}
              onChange={(e) => setScoreForm({ ...scoreForm, comment: e.target.value })}
              placeholder="VD: Bài làm tốt, trình bày sạch đẹp"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

      {/* IMPORT EXCEL MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập Điểm Từ Excel"
        icon={
          <div className="p-2 bg-amber-50 dark:bg-amber-950/60 text-amber-600 rounded-xl">
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
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors shadow-sm"
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
              id="excel-score-file-input"
            />
            <label htmlFor="excel-score-file-input" className="cursor-pointer">
              <FileSpreadsheet className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {importFile ? importFile.name : 'Chọn file Excel (.xlsx)'}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Cột: Email, Tên bài kiểm tra, Điểm, Thang điểm, Ngày chấm, Loại đánh giá, Nhận xét
              </p>
            </label>
          </div>

          {importResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1">
              <div className="text-emerald-600 font-bold">
                ✓ Đã nhập thành công: {importResult.successCount} đầu điểm
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
