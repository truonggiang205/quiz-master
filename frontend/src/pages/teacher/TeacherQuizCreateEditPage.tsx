import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { ClassroomService } from '../../services/classroom.service';
import { StudentService } from '../../services/student.service';
import { Classroom } from '../../types/classroom';
import { User } from '../../types/user';
import { Question } from '../../types/question';
import { QuestionBuilder } from '../../components/teacher/QuestionBuilder';
import { useUiStore } from '../../stores/ui.store';
import { uploadService } from '../../services/upload.service';
import { ArrowLeft, Save, Sparkles, CheckCircle2, Clock, Shield, Calendar, Users, UserPlus, Database } from 'lucide-react';
import Latex from 'react-latex-next';
import { rebalance } from '../../utils/points.util';

export const TeacherQuizCreateEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Tin học / Lập trình Web');
  const [mode, setMode] = useState<'QUIZ' | 'PRACTICE'>('QUIZ');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [totalAttempts, setTotalAttempts] = useState(1);
  const [totalPoints, setTotalPoints] = useState(1000); // Feature: 1000 = 10.00
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [showScoreImmediately, setShowScoreImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  // Bank settings
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedBankQIds, setSelectedBankQIds] = useState<string[]>([]);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  // Assignment settings
  const [assignMode, setAssignMode] = useState<'CLASS' | 'STUDENTS'>('CLASS');
  const [classId, setClassId] = useState<string>('');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  
  const [availableClasses, setAvailableClasses] = useState<Classroom[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Answer release options: 'IMMEDIATE', 'AFTER_30M', 'AFTER_1D', 'CUSTOM'
  const [releaseMode, setReleaseMode] = useState<'IMMEDIATE' | 'AFTER_30M' | 'AFTER_1D' | 'CUSTOM'>('AFTER_30M');
  const [customReleaseDate, setCustomReleaseDate] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      const loadExisting = async () => {
        const quiz = await quizService.getQuizById(id);
        if (quiz) {
          setTitle(quiz.title);
          setDescription(quiz.description);
          setSubject(quiz.subject);
          setMode(quiz.mode || 'QUIZ');
          setDurationMinutes(quiz.durationMinutes);
          setTotalAttempts(quiz.totalAttempts);
          setTotalPoints(quiz.totalPoints || 1000);
          setShuffleQuestions(quiz.shuffleQuestions);
          setShuffleAnswers(quiz.shuffleAnswers);
          setShowScoreImmediately(quiz.showScoreImmediately);
          setShowCorrectAnswers(quiz.showCorrectAnswers);
          setShowExplanation(quiz.showExplanation);

          if (quiz.classId) {
            setAssignMode('CLASS');
            setClassId(quiz.classId);
          } else if (quiz.assignedStudentIds && quiz.assignedStudentIds.length > 0) {
            setAssignMode('STUDENTS');
            setAssignedStudentIds(quiz.assignedStudentIds);
          } else {
            setAssignMode('CLASS'); // default to class if no assignment set
          }

          if (quiz.startTime) {
            setStartTime(new Date(quiz.startTime).toISOString().slice(0, 16));
          }
          if (quiz.endTime) {
            setEndTime(new Date(quiz.endTime).toISOString().slice(0, 16));
          }

          if (quiz.answerReleaseAt) {
            setReleaseMode('CUSTOM');
            setCustomReleaseDate(new Date(quiz.answerReleaseAt).toISOString().slice(0, 16));
          }
        }
        const qs = await quizService.getQuestions(id, false);
        setQuestions(qs);
      };
      
      const loadOptions = async () => {
        try {
          const [classes, students] = await Promise.all([
            ClassroomService.getTeacherClasses(),
            StudentService.getMyStudents(),
          ]);
          setAvailableClasses(classes);
          setAvailableStudents(students);
        } catch (e) {}
      };

      loadOptions().then(loadExisting);
    } else {
      const loadOptions = async () => {
        try {
          const [classes, students] = await Promise.all([
            ClassroomService.getTeacherClasses(),
            StudentService.getMyStudents(),
          ]);
          setAvailableClasses(classes);
          setAvailableStudents(students);
        } catch (e) {}
      };
      loadOptions();
      // Default initial 1 question for convenience
      setQuestions([
        {
          id: `q-${Date.now()}-1`,
          quizId: '',
          content: 'Nội dung câu hỏi số 1...',
          type: 'SINGLE_CHOICE',
          score: 2,
          points: 1000,
          isLocked: false,
          explanation: 'Lời giải chi tiết câu hỏi...',
          order: 1,
          options: [
            { id: `opt-1`, text: 'Lựa chọn A', isCorrect: true },
            { id: `opt-2`, text: 'Lựa chọn B', isCorrect: false },
            { id: `opt-3`, text: 'Lựa chọn C', isCorrect: false },
            { id: `opt-4`, text: 'Lựa chọn D', isCorrect: false },
          ],
        },
      ]);
    }
  }, [id, isEditing]);

  const computeReleaseDate = (): string => {
    const now = Date.now();
    if (releaseMode === 'IMMEDIATE') {
      return new Date(now - 1000).toISOString();
    } else if (releaseMode === 'AFTER_30M') {
      return new Date(now + 30 * 60 * 1000).toISOString();
    } else if (releaseMode === 'AFTER_1D') {
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    } else if (customReleaseDate) {
      return new Date(customReleaseDate).toISOString();
    }
    return new Date(now + 30 * 60 * 1000).toISOString();
  };

  const handleSave = async (publishImmediately = false) => {
    if (!title.trim()) {
      addToast({ type: 'error', title: 'Vui lòng nhập tên bài kiểm tra' });
      return;
    }

    setIsSaving(true);
    addToast({
      type: 'info',
      title: 'Đang lưu bài kiểm tra...',
      message: 'Hệ thống đang xử lý, vui lòng chờ trong giây lát',
    });
    try {
      const releaseTime = computeReleaseDate();
      const quizInput = {
        title,
        description,
        subject,
        mode,
        durationMinutes: Number(durationMinutes),
        totalAttempts: Number(totalAttempts),
        totalPoints: Number(totalPoints),
        shuffleQuestions,
        shuffleAnswers,
        showScoreImmediately,
        showCorrectAnswers,
        showExplanation,
        answerReleaseAt: releaseTime,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        classId: assignMode === 'CLASS' ? classId : undefined,
        assignedStudentIds: assignMode === 'STUDENTS' ? assignedStudentIds : undefined,
      };

      let currentQuizId = id;
      if (isEditing && id) {
        await quizService.updateQuiz(id, quizInput);
      } else {
        const created = await quizService.createQuiz(quizInput);
        currentQuizId = created.id;
      }

      // Save questions
      if (currentQuizId) {
        for (const q of questions) {
          if (!q.quizId) {
            await quizService.createQuestion(currentQuizId, q);
          }
        }
        if (publishImmediately) {
          await quizService.publishQuiz(currentQuizId);
        }
      }

      addToast({
        type: 'success',
        title: isEditing ? 'Cập nhật thành công' : 'Đã tạo bài kiểm tra',
        message: publishImmediately ? 'Bài thi đã được xuất bản cho học sinh!' : 'Đã lưu vào danh sách bản thảo.',
      });
      navigate('/teacher/quizzes');
    } catch {
      addToast({ type: 'error', title: 'Lưu bài kiểm tra thất bại' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenBankModal = async () => {
    setShowBankModal(true);
    setIsLoadingBank(true);
    try {
      const qBank = await quizService.getQuestionBank();
      setBankQuestions(qBank);
      setSelectedBankQIds([]);
    } catch {
      addToast({ type: 'error', title: 'Không thể tải ngân hàng câu hỏi' });
    } finally {
      setIsLoadingBank(false);
    }
  };

  const handleImportBankQuestions = async () => {
    if (selectedBankQIds.length === 0) return;
    
    // We can't import to backend unless we have a quizId. 
    // If it's a draft (no id), we just clone them into local state.
    const selectedQs = bankQuestions.filter(q => selectedBankQIds.includes(q.id));
    const cloned = selectedQs.map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      quizId: id || '',
      options: q.options.map((opt, oIdx) => ({ ...opt, id: `opt-${Date.now()}-${idx}-${oIdx}` }))
    }));
    
    setQuestions([...questions, ...cloned]);
    setShowBankModal(false);
    addToast({ type: 'success', title: `Đã nhập ${cloned.length} câu hỏi từ ngân hàng` });
  };

  const handleSaveToBank = async (qIndex: number) => {
    const q = questions[qIndex];
    if (!q.content) {
      addToast({ type: 'error', title: 'Vui lòng nhập nội dung câu hỏi trước khi lưu' });
      return;
    }
    
    try {
      await quizService.saveToBank(q);
      addToast({ type: 'success', title: 'Đã lưu câu hỏi vào ngân hàng' });
    } catch {
      addToast({ type: 'error', title: 'Lỗi khi lưu vào ngân hàng' });
    }
  };

  const handleImportDocx = async (file: File) => {
    try {
      addToast({ type: 'success', title: 'Đang xử lý file, vui lòng đợi...' });

      // Upload and parse via uploadService
      const parsedData = await uploadService.parseDocument(file);
      
      const parsedQs = (parsedData || []).filter(
        (q: any) => q.content?.trim() && Array.isArray(q.options) && q.options.length > 0
      );

      if (!parsedQs.length) {
        addToast({ type: 'error', title: 'Không tìm thấy câu hỏi hợp lệ trong file' });
        return;
      }

      // Convert parsed questions to the Question format
      const PLACEHOLDER_PREFIXES = ['Nội dung câu hỏi số', 'Nội dung câu hỏi'];
      const isPlaceholder = (q: any) =>
        !q.content ||
        q.content.trim() === '' ||
        PLACEHOLDER_PREFIXES.some(p => q.content.trim().startsWith(p));

      const converted = parsedQs.map((q: any, idx: number) => {
        const opts = (q.options || []).map((o: any, oIdx: number) => ({
          id: `opt-import-${Date.now()}-${idx}-${oIdx}`,
          text: o.text || o.label || '',
          isCorrect: o.isCorrect ?? false,
        }));
        const correctCount = opts.filter((o: any) => o.isCorrect).length;
        return {
          id: `q-import-${Date.now()}-${idx}`,
          quizId: id || '',
          content: q.content,
          type: correctCount > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          score: 2,
          explanation: '',
          options: opts,
          order: 0,
        } as any;
      });

      setQuestions(prev => {
        const existing = [...prev];
        let importIdx = 0;

        // Rule: Overwrite placeholder/empty slots first
        for (let i = 0; i < existing.length && importIdx < converted.length; i++) {
          if (isPlaceholder(existing[i])) {
            existing[i] = { ...converted[importIdx], order: i + 1 };
            importIdx++;
          }
        }

        // Rule: Append remaining imported questions after existing real ones
        const appended = converted.slice(importIdx).map((q: any, i: number) => ({
          ...q,
          order: existing.length + i + 1,
        }));

        return [...existing, ...appended];
      });

      addToast({ type: 'success', title: `Đã nhập ${converted.length} câu hỏi từ file` });
    } catch (err: any) {
      console.error('[Import]', err);
      addToast({
        type: 'error',
        title: 'Lỗi nhập file',
        message: err?.response?.data?.message || 'Vui lòng kiểm tra lại định dạng file.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/teacher/quizzes"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Save className="w-4 h-4 text-slate-500" />
            Lưu bản thảo
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            id="publish-quiz-btn"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-200 dark:shadow-none transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            Xuất bản ngay
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white/90 dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-6 backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {isEditing ? 'Chỉnh Sửa Bài Kiểm Tra' : 'Thiết Lập Bài Kiểm Tra Mới'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cấu hình thời lượng, thể lệ làm bài và thời gian công bố đáp án
          </p>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tiêu đề bài kiểm tra *
            </label>
            <input
              type="text"
              placeholder="VD: Kiểm tra Toán Giải Tích 12 - Khảo sát hàm số"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Mô tả ngắn & hướng dẫn làm bài
            </label>
            <textarea
              rows={2}
              placeholder="Nhập ghi chú hoặc yêu cầu đối với học sinh..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-xs md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>
        </div>

        {/* Configurations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chế độ
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'QUIZ' | 'PRACTICE')}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="QUIZ">Bài Thi</option>
              <option value="PRACTICE">Ôn Tập</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Môn học
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Thời lượng làm bài (phút)
            </label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Số lần làm tối đa
            </label>
            <input
              type="number"
              min={1}
              value={totalAttempts}
              onChange={(e) => setTotalAttempts(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Thang điểm
            </label>
            <select
              value={totalPoints}
              onChange={async (e) => {
                const val = Number(e.target.value);
                const confirmed = await useUiStore.getState().confirm({
                  title: 'Xác nhận thay đổi thang điểm',
                  description: 'Thay đổi thang điểm sẽ chia lại toàn bộ điểm các câu hỏi hiện có. Bạn có chắc chắn?',
                  variant: 'warning'
                });
                if (confirmed) {
                  setTotalPoints(val);
                  setQuestions(prev => {
                    try {
                      return rebalance(prev.map(q => ({ ...q, isLocked: false })), val) as Question[];
                    } catch {
                      return prev;
                    }
                  });
                }
              }}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white focus:outline-none"
            >
              <option value={1000}>Thang 10 (10.00)</option>
              <option value={10000}>Thang 100 (100.0)</option>
              <option value={400}>Thang 4 (4.00)</option>
            </select>
          </div>
        </div>

        {/* Assignment & Deadlines */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Đối tượng tham gia</h3>
            </div>
            
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAssignMode('CLASS')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${assignMode === 'CLASS' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
              >Theo Lớp</button>
              <button
                type="button"
                onClick={() => setAssignMode('STUDENTS')}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${assignMode === 'STUDENTS' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
              >Học sinh 1-1</button>
            </div>

            {assignMode === 'CLASS' && (
              <div>
                <select
                  value={classId}
                  onChange={e => setClassId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {assignMode === 'STUDENTS' && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-900/50 space-y-1">
                {availableStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Chưa có học sinh 1-1 nào trong danh bạ</p>
                ) : (
                  availableStudents.map(student => (
                    <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={assignedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedStudentIds([...assignedStudentIds, student.id]);
                          else setAssignedStudentIds(assignedStudentIds.filter(id => id !== student.id));
                        }}
                        className="rounded text-sky-600 focus:ring-sky-400"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.name} ({student.email})</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Thời gian</h3>
            </div>
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Mở bài thi lúc (Tùy chọn)</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Hạn chót nộp bài (Deadline)</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Answer Release Settings */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/70 to-sky-50/70 dark:from-slate-900/60 dark:to-sky-950/40 border border-sky-100 dark:border-sky-900/60 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs sm:text-sm font-bold text-sky-950 dark:text-sky-200">
              Thiết lập thời gian công bố đáp án & lời giải
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setReleaseMode('IMMEDIATE')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                releaseMode === 'IMMEDIATE'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Ngay sau khi nộp
            </button>
            <button
              type="button"
              onClick={() => setReleaseMode('AFTER_30M')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                releaseMode === 'AFTER_30M'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Sau 30 phút
            </button>
            <button
              type="button"
              onClick={() => setReleaseMode('AFTER_1D')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                releaseMode === 'AFTER_1D'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Sau 1 ngày
            </button>
            <button
              type="button"
              onClick={() => setReleaseMode('CUSTOM')}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                releaseMode === 'CUSTOM'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Tự chọn giờ
            </button>
          </div>

          {releaseMode === 'CUSTOM' && (
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Chọn ngày và giờ mở đáp án:
              </label>
              <input
                type="datetime-local"
                value={customReleaseDate}
                onChange={(e) => setCustomReleaseDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 text-xs">
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded-md text-sky-600 focus:ring-sky-400"
            />
            <span>Đảo thứ tự câu hỏi</span>
          </label>
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleAnswers}
              onChange={(e) => setShuffleAnswers(e.target.checked)}
              className="rounded-md text-sky-600 focus:ring-sky-400"
            />
            <span>Đảo thứ tự các đáp án</span>
          </label>
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showScoreImmediately}
              onChange={(e) => setShowScoreImmediately(e.target.checked)}
              className="rounded-md text-sky-600 focus:ring-sky-400"
            />
            <span>Hiển thị điểm ngay sau nộp</span>
          </label>
        </div>
      </div>

      {/* Question Builder Section */}
      <QuestionBuilder 
        questions={questions} 
        onChange={setQuestions}
        totalPoints={totalPoints}
        onImportFromBank={handleOpenBankModal}
        onSaveToBank={handleSaveToBank}
        onImportFromDocx={handleImportDocx}
      />

      {/* Bank Import Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-sky-500" /> Ngân hàng câu hỏi của tôi
              </h3>
              <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingBank ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                </div>
              ) : bankQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400">Ngân hàng câu hỏi của bạn đang trống.</p>
                  <p className="text-xs text-slate-400 mt-2">Hãy lưu các câu hỏi hay vào ngân hàng để sử dụng lại sau này.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankQuestions.map((q, idx) => (
                    <label key={q.id} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${selectedBankQIds.includes(q.id) ? 'bg-sky-50/50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800' : 'bg-slate-50 border-slate-200 hover:bg-white dark:bg-slate-800 dark:border-slate-700'}`}>
                      <input 
                        type="checkbox"
                        checked={selectedBankQIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedBankQIds([...selectedBankQIds, q.id]);
                          else setSelectedBankQIds(selectedBankQIds.filter(id => id !== q.id));
                        }}
                        className="mt-1 rounded text-sky-600 focus:ring-sky-400"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Câu {idx + 1}: <Latex>{q.content}</Latex></p>
                        <p className="text-xs text-slate-500 mt-1">Loại: {q.type === 'SINGLE_CHOICE' ? 'Một đáp án' : q.type === 'MULTIPLE_CHOICE' ? 'Nhiều đáp án' : q.type === 'TRUE_FALSE' ? 'Đúng/Sai' : 'Tự luận'} • Điểm: {q.score}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="py-2.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={selectedBankQIds.length === 0}
                onClick={handleImportBankQuestions}
                className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-sm shadow-sm"
              >
                Nhập {selectedBankQIds.length > 0 ? `(${selectedBankQIds.length})` : ''} câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
