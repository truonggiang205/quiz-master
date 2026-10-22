import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { submissionService } from '../../services/submission.service';
import { ClassroomService } from '../../services/classroom.service';
import { StudentService } from '../../services/student.service';
import { Classroom } from '../../types/classroom';
import { User } from '../../types/user';
import { Question } from '../../types/question';
import { QuestionBuilder } from '../../components/teacher/QuestionBuilder';
import { useUiStore } from '../../stores/ui.store';
import { uploadService } from '../../services/upload.service';
import { ArrowLeft, Save, Sparkles, CheckCircle2, Clock, Calendar, Users, Database, Search, ExternalLink, BookmarkPlus } from 'lucide-react';
import Latex from 'react-latex-next';
import { rebalance } from '../../utils/points.util';
import { NumberInput } from '../../components/common/NumberInput';
import { Modal } from '../../components/common/Modal';

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
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Answer release options: 'IMMEDIATE', 'AFTER_30M', 'AFTER_1D', 'CUSTOM'
  const [releaseMode, setReleaseMode] = useState<'IMMEDIATE' | 'AFTER_30M' | 'AFTER_1D' | 'CUSTOM'>('AFTER_30M');
  const [customReleaseDate, setCustomReleaseDate] = useState('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const initialQuestionsRef = useRef<Question[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modal sao chép câu hỏi vào ngân hàng
  const [showSaveBankModal, setShowSaveBankModal] = useState(false);
  const [selectedSaveBankQIds, setSelectedSaveBankQIds] = useState<string[]>([]);
  const [saveBankSubject, setSaveBankSubject] = useState('');
  const [saveBankSearch, setSaveBankSearch] = useState('');
  const [saveBankTypeFilter, setSaveBankTypeFilter] = useState('ALL');
  const [isSavingToBank, setIsSavingToBank] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [hasSubmissions, setHasSubmissions] = useState(false);
  const [submissionsCount, setSubmissionsCount] = useState(0);

  useEffect(() => {
    if (isEditing && id) {
      const loadExisting = async () => {
        const [quiz, qs, results] = await Promise.all([
          quizService.getQuizById(id),
          quizService.getQuestions(id, false),
          submissionService.getQuizResults(id).catch(() => null),
        ]);

        if (results?.submissions?.length) {
          setHasSubmissions(true);
          setSubmissionsCount(results.submissions.length);
        }

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
        initialQuestionsRef.current = JSON.parse(JSON.stringify(qs));
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

    if (!questions || questions.length === 0) {
      addToast({
        type: 'error',
        title: 'Chưa có câu hỏi',
        message: 'Vui lòng thêm ít nhất 1 câu hỏi cho bài kiểm tra.',
      });
      return;
    }

    // Validate questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content || !q.content.trim()) {
        addToast({
          type: 'error',
          title: 'Nội dung câu hỏi trống',
          message: `Câu hỏi số ${i + 1} chưa có nội dung. Vui lòng kiểm tra lại.`,
        });
        return;
      }

      if (q.type !== 'ESSAY') {
        const validOpts = (q.options || []).filter(o => o.text && o.text.trim());
        if (validOpts.length < 2) {
          addToast({
            type: 'error',
            title: 'Thiếu đáp án',
            message: `Câu hỏi số ${i + 1} phải có ít nhất 2 lựa chọn có nội dung.`,
          });
          return;
        }

        const hasCorrect = (q.options || []).some(o => o.isCorrect);
        if (!hasCorrect) {
          addToast({
            type: 'error',
            title: 'Chưa chọn đáp án đúng',
            message: `Câu hỏi số ${i + 1} chưa được chọn đáp án đúng.`,
          });
          return;
        }
      }
    }

    // Validate times
    let parsedStartTime: string | undefined;
    if (startTime) {
      const d = new Date(startTime);
      if (isNaN(d.getTime())) {
        addToast({ type: 'error', title: 'Thời gian bắt đầu không hợp lệ' });
        return;
      }
      parsedStartTime = d.toISOString();
    }

    let parsedEndTime: string | undefined;
    if (endTime) {
      const d = new Date(endTime);
      if (isNaN(d.getTime())) {
        addToast({ type: 'error', title: 'Thời gian kết thúc không hợp lệ' });
        return;
      }
      parsedEndTime = d.toISOString();
    }

    if (parsedStartTime && parsedEndTime && new Date(parsedStartTime) >= new Date(parsedEndTime)) {
      addToast({
        type: 'error',
        title: 'Thời gian không hợp lệ',
        message: 'Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.',
      });
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
      const cleanClassId = assignMode === 'CLASS' && classId?.trim() ? classId.trim() : undefined;
      const cleanAssignedStudentIds = assignMode === 'STUDENTS' && assignedStudentIds?.length ? assignedStudentIds : undefined;

      const quizInput = {
        title: title.trim(),
        description: description?.trim() || '',
        subject: subject?.trim() || 'Tổng hợp',
        mode,
        durationMinutes: Number(durationMinutes) || 45,
        totalAttempts: Number(totalAttempts) || 1,
        totalPoints: Number(totalPoints) || 1000,
        shuffleQuestions,
        shuffleAnswers,
        showScoreImmediately,
        showCorrectAnswers,
        showExplanation,
        answerReleaseAt: releaseTime,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        classId: cleanClassId,
        assignedStudentIds: cleanAssignedStudentIds,
      };

      // Clean options, format essayRubric, and conditionally rebalance points
      let processedQuestions: Question[] = questions.map((q, idx) => ({
        ...q,
        order: idx + 1,
        content: q.content.trim(),
        options: q.type === 'ESSAY'
          ? []
          : (q.options || []).filter(o => o.text && o.text.trim()).map(o => ({
              ...o,
              text: o.text.trim(),
            })),
        essayRubric: q.type === 'ESSAY' && q.essayRubric
          ? {
              acceptedAnswers: (q.essayRubric.acceptedAnswers || [])
                .map((a: string) => (typeof a === 'string' ? a.trim() : ''))
                .filter((a: string) => a.length > 0),
              criteria: (q.essayRubric.criteria || []).map((c: any) => ({
                id: c.id || `crit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                description: c.description?.trim() || '',
                keywords: (c.keywords || [])
                  .map((k: string) => (typeof k === 'string' ? k.trim() : ''))
                  .filter((k: string) => k.length > 0),
                maxPoints: Number(c.maxPoints) || 0,
                requireAll: !!c.requireAll,
              })),
              totalScore: q.points || Math.round((q.score || 2) * 100),
            }
          : q.essayRubric,
      }));

      // Chỉ rebalance điểm khi bài thi chưa có học sinh làm bài
      if (!hasSubmissions) {
        try {
          processedQuestions = rebalance(processedQuestions, Number(totalPoints)) as Question[];
        } catch (e: any) {
          console.warn('Rebalance warn:', e);
        }
      }

      let currentQuizId = id || '';
      setSaveStatus('saving');

      if (isEditing && id) {
        await quizService.updateQuiz(id, quizInput);
        currentQuizId = id;

        // Đồng bộ câu hỏi theo DIFF (chỉ gửi câu thay đổi, không gửi lại cả 30 câu)
        const initialMap = new Map((initialQuestionsRef.current || []).map((eq) => [eq.id, eq]));
        const currentActiveIds = new Set(processedQuestions.map((pq) => pq.id));

        // 1. Delete questions (chỉ khi chưa có bài nộp)
        const deletedIds = hasSubmissions
          ? []
          : (initialQuestionsRef.current || [])
              .filter((eq) => !currentActiveIds.has(eq.id))
              .map((eq) => eq.id);

        // 2. Created questions (các câu mới thêm vào danh sách)
        const created = processedQuestions
          .filter((pq) => !initialMap.has(pq.id))
          .map((pq) => ({
            content: pq.content,
            type: pq.type,
            options: pq.options,
            score: pq.score,
            points: pq.points,
            isLocked: pq.isLocked,
            explanation: pq.explanation,
            order: pq.order,
            imageUrl: pq.imageUrl,
            essayRubric: pq.essayRubric,
          }));

        // 3. Updated questions (chỉ các câu thực sự có thay đổi)
        const updated: { id: string; changes: any }[] = [];
        for (const pq of processedQuestions) {
          const oldQ = initialMap.get(pq.id);
          if (oldQ) {
            const isContentDiff = oldQ.content !== pq.content;
            const isTypeDiff = oldQ.type !== pq.type;
            const isScoreDiff = oldQ.score !== pq.score || oldQ.points !== pq.points;
            const isLockedDiff = oldQ.isLocked !== pq.isLocked;
            const isExplDiff = (oldQ.explanation || '') !== (pq.explanation || '');
            const isImageDiff = oldQ.imageUrl !== pq.imageUrl;
            const isOrderDiff = oldQ.order !== pq.order;
            const isOptionsDiff = JSON.stringify(oldQ.options) !== JSON.stringify(pq.options);
            const isRubricDiff = JSON.stringify(oldQ.essayRubric || null) !== JSON.stringify(pq.essayRubric || null);

            if (
              isContentDiff ||
              isTypeDiff ||
              isScoreDiff ||
              isLockedDiff ||
              isExplDiff ||
              isImageDiff ||
              isOrderDiff ||
              isOptionsDiff ||
              isRubricDiff
            ) {
              updated.push({
                id: pq.id,
                changes: {
                  content: pq.content,
                  type: pq.type,
                  options: pq.options,
                  score: pq.score,
                  points: pq.points,
                  isLocked: pq.isLocked,
                  explanation: pq.explanation,
                  order: pq.order,
                  imageUrl: pq.imageUrl,
                  essayRubric: pq.essayRubric,
                },
              });
            }
          }
        }

        // Gọi diff sync trong 1 transaction duy nhất nếu có câu thay đổi
        if (created.length > 0 || updated.length > 0 || deletedIds.length > 0) {
          await quizService.syncQuestionsDiff(id, { created, updated, deletedIds });
        }
        initialQuestionsRef.current = JSON.parse(JSON.stringify(processedQuestions));
      } else {
        const created = await quizService.createQuiz(quizInput);
        currentQuizId = created.id;

        // Lưu câu hỏi mới hàng loạt qua sync endpoint trong 1 transaction
        await quizService.syncQuestionsDiff(created.id, {
          created: processedQuestions.map((pq) => ({
            content: pq.content,
            type: pq.type,
            options: pq.options,
            score: pq.score,
            points: pq.points,
            isLocked: pq.isLocked,
            explanation: pq.explanation,
            order: pq.order,
            imageUrl: pq.imageUrl,
            essayRubric: pq.essayRubric,
          })),
        });
      }

      setSaveStatus('saved');

      if (publishImmediately && currentQuizId) {
        await quizService.publishQuiz(currentQuizId);
      }

      addToast({
        type: 'success',
        title: isEditing ? 'Cập nhật thành công' : 'Đã tạo bài kiểm tra',
        message: hasSubmissions
          ? 'Đã cập nhật bài thi và tự động chấm điểm cho học sinh!'
          : (publishImmediately ? 'Bài thi đã được xuất bản cho học sinh!' : 'Đã lưu vào danh sách bản thảo.'),
      });
      navigate('/teacher/quizzes');
    } catch (err: any) {
      console.error('Lỗi khi lưu bài kiểm tra:', err);
      const rawMsg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu bài kiểm tra. Vui lòng kiểm tra lại kết nối.';
      const displayMsg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg;
      addToast({
        type: 'error',
        title: 'Lưu bài kiểm tra thất bại',
        message: displayMsg,
      });
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
    
    const selectedQs = bankQuestions.filter(q => selectedBankQIds.includes(q.id));
    const cloned = selectedQs.map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      quizId: '',
      options: q.options.map((opt, oIdx) => ({
        ...opt,
        id: `opt-${Date.now()}-${idx}-${oIdx}`,
      })),
    }));
    
    const nextQuestions = [...questions, ...cloned];
    try {
      setQuestions(rebalance(nextQuestions, Number(totalPoints)) as Question[]);
    } catch {
      setQuestions(nextQuestions);
    }

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
      addToast({ type: 'info', title: 'Đang xử lý file, vui lòng đợi...' });

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
        let opts = (q.options || []).map((o: any, oIdx: number) => ({
          id: `opt-import-${Date.now()}-${idx}-${oIdx}`,
          text: (o.text || o.label || '').trim(),
          isCorrect: o.isCorrect ?? false,
        })).filter((o: any) => o.text !== '');

        // If no options marked correct, mark the first one as default
        if (opts.length > 0 && !opts.some((o: any) => o.isCorrect)) {
          opts[0].isCorrect = true;
        }

        const correctCount = opts.filter((o: any) => o.isCorrect).length;
        return {
          id: `q-import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          quizId: '',
          content: q.content.trim(),
          type: correctCount > 1 ? 'MULTIPLE_CHOICE' : 'SINGLE_CHOICE',
          score: 2,
          points: 0,
          isLocked: false,
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

        const combined = [...existing, ...appended];
        try {
          return rebalance(combined, Number(totalPoints)) as Question[];
        } catch {
          return combined;
        }
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

  const handleOpenSaveBankModal = () => {
    if (!id) {
      addToast({
        type: 'warning',
        title: 'Chưa lưu bài kiểm tra',
        message: 'Vui lòng nhấn "Lưu bản thảo" hoặc "Xuất bản ngay" trước khi sao chép câu hỏi vào ngân hàng câu hỏi để bảo đảm câu hỏi đã được tạo ID bền vững.',
      });
      return;
    }

    if (questions.length === 0) {
      addToast({ type: 'warning', title: 'Không có câu hỏi', message: 'Bài thi hiện chưa có câu hỏi nào để lưu vào ngân hàng.' });
      return;
    }

    setSaveBankSubject(subject || 'Chưa phân loại');
    setSelectedSaveBankQIds(questions.map((q) => q.id));
    setSaveBankSearch('');
    setSaveBankTypeFilter('ALL');
    setShowSaveBankModal(true);
  };

  const handleExecuteSaveToBank = async () => {
    if (!id || selectedSaveBankQIds.length === 0) return;
    setIsSavingToBank(true);
    try {
      const res = await quizService.saveToBankFromExam(id, selectedSaveBankQIds, saveBankSubject);
      addToast({
        type: 'success',
        title: 'Lưu vào ngân hàng thành công',
        message: `Đã lưu ${res.savedCount} câu hỏi vào ngân hàng${res.duplicateCount > 0 ? ` (bỏ qua ${res.duplicateCount} câu trùng lặp)` : ''}!`,
      });
      setShowSaveBankModal(false);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Lưu ngân hàng thất bại',
        message: err?.response?.data?.message || 'Có lỗi xảy ra khi sao chép câu hỏi vào ngân hàng.',
      });
    } finally {
      setIsSavingToBank(false);
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
          {saveStatus === 'saving' && (
            <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1 mr-1">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              Đang lưu...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mr-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã lưu
            </span>
          )}

          <button
            type="button"
            onClick={handleOpenSaveBankModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Sao chép các câu hỏi trong đề này vào ngân hàng câu hỏi dùng chung"
          >
            <BookmarkPlus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Lưu ngân hàng
          </button>

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

      {/* Submissions notice banner */}
      {hasSubmissions && (
        <div className="flex items-start gap-3.5 p-4 sm:p-5 bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 rounded-3xl text-xs text-sky-900 dark:text-sky-200 shadow-sm backdrop-blur-sm">
          <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-sky-950 dark:text-white flex items-center gap-2">
              Bài thi đã có {submissionsCount} học sinh nộp bài
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              Điểm số câu hỏi được giữ cố định để bảo đảm tính công bằng. Bạn có thể tự do cập nhật nội dung, lời giải và <strong>cấu hình đáp án tự luận (chấm tuyệt đối & tiêu chí từ khóa)</strong>. Khi bấm lưu, hệ thống sẽ <strong>tự động chấm điểm (auto-grade)</strong> lại các bài làm tự luận của học sinh!
            </p>
          </div>
        </div>
      )}

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
              aria-label="Tiêu đề bài kiểm tra"
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
              aria-label="Mô tả ngắn & hướng dẫn làm bài"
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
            <NumberInput
              min={1}
              defaultValue={45}
              value={durationMinutes}
              onChange={(val) => setDurationMinutes(val)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Số lần làm tối đa
            </label>
            <NumberInput
              min={1}
              defaultValue={1}
              value={totalAttempts}
              onChange={(val) => setTotalAttempts(val)}
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
        hasSubmissions={hasSubmissions}
        onImportFromBank={handleOpenBankModal}
        onSaveToBank={handleSaveToBank}
        onImportFromDocx={handleImportDocx}
      />

      {/* Bank Import Modal */}
      <Modal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        maxWidth="3xl"
        title="Ngân hàng câu hỏi của tôi"
        description="Chọn các câu hỏi từ ngân hàng để thêm vào bài thi"
        footer={
          <div className="flex justify-end gap-3 w-full">
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
        }
      >
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
      </Modal>

      {/* Save Questions to Bank Modal */}
      <Modal
        isOpen={showSaveBankModal}
        onClose={() => setShowSaveBankModal(false)}
        maxWidth="3xl"
        title="Sao chép câu hỏi vào ngân hàng"
        description="Chọn các câu hỏi từ đề thi này để lưu vào kho ngân hàng dùng chung"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Đã chọn: <span className="text-sky-600 dark:text-sky-400 font-mono text-sm">{selectedSaveBankQIds.length}</span> / {questions.length} câu
              </span>
              <Link
                to="/teacher/question-bank"
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1 text-xs text-sky-600 hover:underline"
              >
                <span>Xem ngân hàng câu hỏi</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowSaveBankModal(false)}
                className="py-2 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold transition-colors text-xs border border-slate-200 dark:border-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={selectedSaveBankQIds.length === 0 || isSavingToBank}
                onClick={handleExecuteSaveToBank}
                className="py-2 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-xs shadow-sm flex items-center gap-1.5"
              >
                {isSavingToBank ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Lưu vào ngân hàng ({selectedSaveBankQIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Filter & Options Toolbar */}
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Môn học / Chủ đề ngân hàng:
                </label>
                <input
                  type="text"
                  value={saveBankSubject}
                  onChange={(e) => setSaveBankSubject(e.target.value)}
                  aria-label="Môn học hoặc chủ đề ngân hàng"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lọc theo loại:
                  </label>
                  <select
                    value={saveBankTypeFilter}
                    onChange={(e) => setSaveBankTypeFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="ALL">Tất cả loại câu hỏi</option>
                    <option value="SINGLE_CHOICE">Trắc nghiệm đơn</option>
                    <option value="MULTIPLE_CHOICE">Trắc nghiệm nhiều đáp án</option>
                    <option value="TRUE_FALSE">Đúng / Sai</option>
                    <option value="ESSAY">Tự luận</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={saveBankSearch}
                  onChange={(e) => setSaveBankSearch(e.target.value)}
                  aria-label="Tìm theo nội dung câu hỏi"
                  placeholder="Tìm theo nội dung câu hỏi..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allVisibleIds = questions
                      .filter((q) => {
                        const matchesType = saveBankTypeFilter === 'ALL' || q.type === saveBankTypeFilter;
                        const matchesSearch = !saveBankSearch || q.content.toLowerCase().includes(saveBankSearch.toLowerCase());
                        return matchesType && matchesSearch;
                      })
                      .map((q) => q.id);
                    setSelectedSaveBankQIds(allVisibleIds);
                  }}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Chọn tất cả
                </button>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedSaveBankQIds([])}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3">
            {(() => {
              const filtered = questions.filter((q) => {
                const matchesType = saveBankTypeFilter === 'ALL' || q.type === saveBankTypeFilter;
                const matchesSearch = !saveBankSearch || q.content.toLowerCase().includes(saveBankSearch.toLowerCase());
                return matchesType && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-10 text-xs text-slate-400">
                    Không tìm thấy câu hỏi phù hợp với bộ lọc tìm kiếm.
                  </div>
                );
              }

              return filtered.map((q, idx) => {
                const isChecked = selectedSaveBankQIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800 shadow-xs'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSaveBankQIds([...selectedSaveBankQIds, q.id]);
                        } else {
                          setSelectedSaveBankQIds(selectedSaveBankQIds.filter((qid) => qid !== q.id));
                        }
                      }}
                      className="mt-1 rounded text-sky-600 focus:ring-sky-400"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Câu {q.order || idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {q.type === 'SINGLE_CHOICE'
                            ? 'Trắc nghiệm đơn'
                            : q.type === 'MULTIPLE_CHOICE'
                            ? 'Nhiều đáp án'
                            : q.type === 'TRUE_FALSE'
                            ? 'Đúng / Sai'
                            : 'Tự luận'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-2">
                        <Latex>{q.content || '(Chưa có nội dung)'}</Latex>
                      </p>
                    </div>
                  </label>
                );
              });
            })()}
          </div>
        </div>
      </Modal>
    </div>
  );
};
