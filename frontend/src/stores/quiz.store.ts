import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quiz } from '../types/quiz';
import { Question } from '../types/question';

interface QuizTakingState {
  currentQuiz: Quiz | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string[]>; // questionId -> array of selected optionIds
  essayAnswers: Record<string, string[]>; // questionId -> array of uploaded image urls
  essayTextAnswers: Record<string, string>; // questionId -> text answer
  statementAnswers: Record<string, Record<string, boolean>>;
  flaggedQuestionIds: string[]; // questionIds marked for review
  remainingSeconds: number;
  startedAtMs: number | null; // Epoch ms when the exam was started (wall clock)
  isTimerRunning: boolean;
  isSubmitModalOpen: boolean;
  attemptId: string | null;

  // Actions
  initQuizTaking: (quiz: Quiz, questions: Question[], attemptId: string, startedAt?: string, draftAnswers?: any[]) => void;
  selectSingleAnswer: (questionId: string, optionId: string) => void;
  toggleMultipleAnswer: (questionId: string, optionId: string) => void;
  addEssayAnswer: (questionId: string, url: string) => void;
  removeEssayAnswer: (questionId: string, index: number) => void;
  setEssayTextAnswer: (questionId: string, text: string) => void;
  setStatementAnswer: (questionId: string, statementId: string, answer: boolean) => void;
  toggleFlagQuestion: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  decrementTimer: () => void;
  setSubmitModalOpen: (isOpen: boolean) => void;
  resetExam: () => void;
}

export const useQuizStore = create<QuizTakingState>()(
  persist(
    (set, get) => ({
  currentQuiz: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: {},
  essayAnswers: {},
  essayTextAnswers: {},
  statementAnswers: {},
  flaggedQuestionIds: [],
  remainingSeconds: 0,
  startedAtMs: null,
  isTimerRunning: false,
  isSubmitModalOpen: false,
  attemptId: null,

  initQuizTaking: (quiz: Quiz, questions: Question[], attemptId: string, startedAt?: string, draftAnswers?: any[]) => {
    const current = get();
    const nowMs = Date.now();
    const totalSeconds = quiz.durationMinutes * 60;

    // Resume same quiz in progress
    if (current.currentQuiz?.id === quiz.id && current.attemptId === attemptId && current.isTimerRunning && current.startedAtMs) {
      // Recalculate remaining based on wall clock to correct for offline time
      const elapsedSeconds = Math.floor((nowMs - current.startedAtMs) / 1000);
      const correctedRemaining = Math.max(0, totalSeconds - elapsedSeconds);
      set({ currentQuiz: quiz, questions, remainingSeconds: correctedRemaining });
      return;
    }

    const restored = (draftAnswers || []).reduce((state, answer) => {
      if (!answer?.questionId) return state;
      state.answers[answer.questionId] = answer.selectedOptionIds || [];
      if (answer.essayImageUrl) state.essayAnswers[answer.questionId] = String(answer.essayImageUrl).split('|||').filter(Boolean);
      if (answer.essayText) state.essayTextAnswers[answer.questionId] = answer.essayText;
      if (Array.isArray(answer.statementAnswers)) {
        state.statementAnswers[answer.questionId] = Object.fromEntries(answer.statementAnswers
          .filter((statement: any) => typeof statement?.answer === 'boolean')
          .map((statement: any) => [statement.statementId, statement.answer]));
      }
      return state;
    }, { answers: {} as Record<string, string[]>, essayAnswers: {} as Record<string, string[]>, essayTextAnswers: {} as Record<string, string>, statementAnswers: {} as Record<string, Record<string, boolean>> });

    // Brand-new attempt or server-side restored work
    set({
      currentQuiz: quiz,
      questions,
      currentQuestionIndex: 0,
      answers: restored.answers,
      essayAnswers: restored.essayAnswers,
      essayTextAnswers: restored.essayTextAnswers,
      statementAnswers: restored.statementAnswers,
      flaggedQuestionIds: [],
      remainingSeconds: totalSeconds,
      startedAtMs: startedAt ? new Date(startedAt).getTime() : nowMs,
      isTimerRunning: true,
      isSubmitModalOpen: false,
      attemptId,
    });
  },

  selectSingleAnswer: (questionId: string, optionId: string) => {
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: [optionId],
      },
    }));
  },

  toggleMultipleAnswer: (questionId: string, optionId: string) => {
    const currentList = get().answers[questionId] || [];
    const exists = currentList.includes(optionId);
    const updated = exists
      ? currentList.filter((id) => id !== optionId)
      : [...currentList, optionId];

    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: updated,
      },
    }));
  },

  addEssayAnswer: (questionId: string, url: string) => {
    set((state) => {
      const current = Array.isArray(state.essayAnswers[questionId]) 
        ? state.essayAnswers[questionId] 
        : (state.essayAnswers[questionId] ? [state.essayAnswers[questionId] as unknown as string] : []);
      return {
        essayAnswers: {
          ...state.essayAnswers,
          [questionId]: [...current, url],
        }
      };
    });
  },

  removeEssayAnswer: (questionId: string, index: number) => {
    set((state) => {
      const current = Array.isArray(state.essayAnswers[questionId]) 
        ? state.essayAnswers[questionId] 
        : (state.essayAnswers[questionId] ? [state.essayAnswers[questionId] as unknown as string] : []);
      return {
        essayAnswers: {
          ...state.essayAnswers,
          [questionId]: current.filter((_, i) => i !== index),
        }
      };
    });
  },

  setEssayTextAnswer: (questionId: string, text: string) => {
    set((state) => ({
      essayTextAnswers: {
        ...state.essayTextAnswers,
        [questionId]: text,
      }
    }));
  },

  setStatementAnswer: (questionId, statementId, answer) => set(state => ({
    statementAnswers: { ...state.statementAnswers, [questionId]: { ...state.statementAnswers?.[questionId], [statementId]: answer } },
  })),

  toggleFlagQuestion: (questionId: string) => {
    const list = get().flaggedQuestionIds;
    const updated = list.includes(questionId)
      ? list.filter((id) => id !== questionId)
      : [...list, questionId];
    set({ flaggedQuestionIds: updated });
  },

  goToQuestion: (index: number) => {
    const total = get().questions.length;
    if (index >= 0 && index < total) {
      set({ currentQuestionIndex: index });
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  decrementTimer: () => {
    const remaining = get().remainingSeconds;
    if (remaining > 0) {
      set({ remainingSeconds: remaining - 1 });
    } else {
      set({ isTimerRunning: false });
    }
  },

  setSubmitModalOpen: (isOpen: boolean) => set({ isSubmitModalOpen: isOpen }),

  resetExam: () => {
    set({
      currentQuiz: null,
      questions: [],
      currentQuestionIndex: 0,
      answers: {},
      essayAnswers: {},
      essayTextAnswers: {},
      statementAnswers: {},
      flaggedQuestionIds: [],
      remainingSeconds: 0,
      startedAtMs: null,
      isTimerRunning: false,
      isSubmitModalOpen: false,
      attemptId: null,
    });
  },
    }),
    {
      name: 'quiz-master-taking-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentQuiz: state.currentQuiz,
        questions: state.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        answers: state.answers,
        essayAnswers: state.essayAnswers,
        essayTextAnswers: state.essayTextAnswers,
        statementAnswers: state.statementAnswers,
        flaggedQuestionIds: state.flaggedQuestionIds,
        remainingSeconds: state.remainingSeconds,
        startedAtMs: state.startedAtMs,
        isTimerRunning: state.isTimerRunning,
        attemptId: state.attemptId,
      }),
    }
  )
);
