import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizService } from '../../services/quiz.service';
import { submissionService } from '../../services/submission.service';
import { useQuizStore } from '../../stores/quiz.store';
import { useUiStore } from '../../stores/ui.store';
import { QuestionCard } from '../../components/quiz/QuestionCard';
import { QuestionPalette } from '../../components/quiz/QuestionPalette';
import { QuizTimer } from '../../components/quiz/QuizTimer';
import { ConfirmationModal } from '../../components/common/ConfirmationModal';
import { ArrowLeft, ArrowRight, Send, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { isQuestionAnswered } from '../../utils/quiz.utils';

export const StudentQuizTakingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const {
    currentQuiz,
    questions,
    currentQuestionIndex,
    answers,
    essayAnswers,
    essayTextAnswers,
    flaggedQuestionIds,
    remainingSeconds,
    initQuizTaking,
    selectSingleAnswer,
    toggleMultipleAnswer,
    addEssayAnswer,
    removeEssayAnswer,
    setEssayTextAnswer,
    toggleFlagQuestion,
    nextQuestion,
    prevQuestion,
    resetExam,
  } = useQuizStore();

  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Quiz & Questions
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [quizData, questionsData] = await Promise.all([
          quizService.getQuizById(id),
          quizService.getQuestions(id, true), // examMode = true masks answers!
        ]);

        if (!quizData) {
          addToast({ type: 'error', title: 'Không tìm thấy bài kiểm tra' });
          navigate('/student/quizzes');
          return;
        }

        // Verify start conditions (e.g. attempt limits)
        try {
          await submissionService.startQuiz(id);
        } catch (error: any) {
          addToast({ 
            type: 'error', 
            title: 'Không thể làm bài', 
            message: error.response?.data?.message || 'Bạn đã hết số lần làm bài hoặc bài thi chưa mở'
          });
          navigate('/student/quizzes');
          return;
        }

        initQuizTaking(quizData, questionsData);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Không tìm thấy bài kiểm tra', message: 'Bài thi này đã bị xóa hoặc không còn khả dụng.' });
        resetExam();
        navigate('/student/quizzes');
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      // Don't reset exam if navigating to results
    };
  }, [id, initQuizTaking, navigate, addToast, resetExam]);

  // Sync timer with wall clock on tab focus (handles cases where user was away)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const state = useQuizStore.getState();
        if (state.isTimerRunning && state.startedAtMs && state.currentQuiz) {
          const totalSeconds = state.currentQuiz.durationMinutes * 60;
          const elapsedSeconds = Math.floor((Date.now() - state.startedAtMs) / 1000);
          const correctedRemaining = Math.max(0, totalSeconds - elapsedSeconds);
          useQuizStore.setState({ remainingSeconds: correctedRemaining });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Prevent accidental refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Bạn có chắc chắn muốn rời khỏi trang? Bài làm của bạn có thể sẽ chưa được lưu nếu chưa nộp!';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSelectOption = (optionId: string) => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return;

    if (currentQ.type === 'MULTIPLE_CHOICE') {
      toggleMultipleAnswer(currentQ.id, optionId);
    } else {
      selectSingleAnswer(currentQ.id, optionId);
    }
  };

  const handleDoSubmit = useCallback(async () => {
    if (!id || !currentQuiz || isSubmitting) return;

    setIsSubmitting(true);
    addToast({ type: 'info', title: 'Đang nộp bài...', message: 'Hệ thống đang xử lý bài làm của bạn, vui lòng không tắt trang' });
    try {
      const formattedAnswers = questions.map((q) => {
        const essayArr = Array.isArray(essayAnswers[q.id]) 
          ? essayAnswers[q.id] 
          : (essayAnswers[q.id] ? [essayAnswers[q.id] as unknown as string] : []);
          
        return {
          questionId: q.id,
          selectedOptionIds: answers[q.id] || [],
          essayImageUrl: essayArr.join('|||'),
          essayText: essayTextAnswers[q.id] || '',
        };
      });

      const totalExamSeconds = currentQuiz.durationMinutes * 60;
      const timeUsed = Math.max(1, totalExamSeconds - remainingSeconds);

      const submission = await submissionService.submitQuiz(
        id,
        formattedAnswers,
        timeUsed,
      );

      addToast({
        type: 'success',
        title: 'Nộp bài thi thành công!',
        message: `Bạn đạt ${submission.score} điểm (${submission.percentage}%)`,
      });

      resetExam();
      navigate(`/student/quizzes/${id}/result?submissionId=${submission.id}`);
    } catch (error: any) {
      addToast({ 
        type: 'error', 
        title: 'Nộp bài thi thất bại',
        message: error.response?.data?.message || 'Có lỗi xảy ra khi nộp bài'
      });
      setIsSubmitting(false);
    }
  }, [id, currentQuiz, isSubmitting, answers, essayAnswers, essayTextAnswers, questions, remainingSeconds, addToast, resetExam, navigate]);

  const handleTimeExpired = useCallback(() => {
    addToast({
      type: 'warning',
      title: 'Hết thời gian làm bài!',
      message: 'Hệ thống đang tự động thu bài và chấm điểm cho bạn...',
    });
    handleDoSubmit();
  }, [addToast, handleDoSubmit]);

  if (loading || !currentQuiz || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Đang chuẩn bị phòng thi của bạn...</span>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const selectedOptions = answers[currentQ.id] || [];
  const isFlagged = flaggedQuestionIds.includes(currentQ.id);

  const answerState = { answers, essayAnswers, essayTextAnswers };
  const answeredCount = questions.filter((q) =>
    isQuestionAnswered(q, answerState),
  ).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Bar: Title, Progress & Timer */}
      <div className="bg-white/95 dark:bg-slate-800/95 rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-sky-500 tracking-wider">
            {currentQuiz.subject}
          </span>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight line-clamp-1">
            {currentQuiz.title}
          </h1>
        </div>

        {/* Real-time Timer */}
        <div className="flex items-center gap-3">
          <QuizTimer onTimeExpired={handleTimeExpired} />
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            id="finish-exam-top-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* Thin Progress bar */}
      <div 
        className="w-full bg-slate-200/80 dark:bg-slate-700/60 h-1.5 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-sky-600 h-full rounded-full transition-transform duration-300 origin-left"
          style={{ transform: `scaleX(${progressPercent / 100})` }}
        />
      </div>

      {/* Main Examination Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Palette Navigation */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <QuestionPalette />
        </div>

        {/* Right Column: Question Content & Interactive Options */}
        <div className="lg:col-span-8 order-1 lg:order-2 space-y-4">
          <QuestionCard
            question={currentQ}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            selectedOptionIds={selectedOptions}
            isFlagged={isFlagged}
            onSelectOption={handleSelectOption}
            onUploadEssayImage={(url) => addEssayAnswer(currentQ.id, url)}
            onRemoveEssayImage={(index) => removeEssayAnswer(currentQ.id, index)}
            essayImageUrls={
              Array.isArray(essayAnswers[currentQ.id]) 
                ? essayAnswers[currentQ.id] 
                : (essayAnswers[currentQ.id] ? [essayAnswers[currentQ.id] as unknown as string] : [])
            }
            essayText={essayTextAnswers[currentQ.id] || ''}
            onEssayTextChange={(text) => setEssayTextAnswer(currentQ.id, text)}
            onToggleFlag={() => toggleFlagQuestion(currentQ.id)}
          />

          {/* Navigation Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              id="prev-question-btn"
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors ${
                currentQuestionIndex === 0
                  ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFlagQuestion(currentQ.id)}
              aria-label={isFlagged ? "Bỏ cắm cờ câu hỏi" : "Cắm cờ câu hỏi"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold sm:hidden border ${
                isFlagged
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
            </button>

            {currentQuestionIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={nextQuestion}
                id="next-question-btn"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-700 transition-colors shadow-xs"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                id="submit-exam-bottom-btn"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Hoàn thành & Nộp bài</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <ConfirmationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={handleDoSubmit}
        isLoading={isSubmitting}
        title="Bạn có chắc muốn nộp bài thi?"
        description="Sau khi nộp bài, bạn không thể chỉnh sửa đáp án đã chọn nữa. Vui lòng kiểm tra kỹ trước khi xác nhận."
        confirmText="Xác nhận nộp bài"
        cancelText="Tiếp tục làm bài"
        variant="primary"
      >
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-center">
            <motion.span 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className="block text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono"
            >
              {answeredCount}
            </motion.span>
            <span className="text-[11px] font-bold text-emerald-600 uppercase">
              Đã trả lời
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-center">
            <motion.span 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
              className="block text-2xl font-black text-amber-700 dark:text-amber-300 font-mono"
            >
              {unansweredCount}
            </motion.span>
            <span className="text-[11px] font-bold text-amber-600 uppercase">
              Chưa trả lời
            </span>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
};
