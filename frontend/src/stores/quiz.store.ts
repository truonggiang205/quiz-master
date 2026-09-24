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
  flaggedQuestionIds: string[]; // questionIds marked for review
  remainingSeconds: number;
  isTimerRunning: boolean;
  isSubmitModalOpen: boolean;

  // Actions
  initQuizTaking: (quiz: Quiz, questions: Question[]) => void;
  selectSingleAnswer: (questionId: string, optionId: string) => void;
  toggleMultipleAnswer: (questionId: string, optionId: string) => void;
  addEssayAnswer: (questionId: string, url: string) => void;
  removeEssayAnswer: (questionId: string, index: number) => void;
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
  flaggedQuestionIds: [],
  remainingSeconds: 0,
  isTimerRunning: false,
  isSubmitModalOpen: false,

  initQuizTaking: (quiz: Quiz, questions: Question[]) => {
    const current = get();
    // Resume same quiz
    if (current.currentQuiz?.id === quiz.id) {
      set({ currentQuiz: quiz, questions });
      return;
    }

    // Duration in seconds
    const totalSeconds = quiz.durationMinutes * 60;
    set({
      currentQuiz: quiz,
      questions,
      currentQuestionIndex: 0,
      answers: {},
      essayAnswers: {},
      flaggedQuestionIds: [],
      remainingSeconds: totalSeconds,
      isTimerRunning: true,
      isSubmitModalOpen: false,
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
      flaggedQuestionIds: [],
      remainingSeconds: 0,
      isTimerRunning: false,
      isSubmitModalOpen: false,
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
        flaggedQuestionIds: state.flaggedQuestionIds,
        remainingSeconds: state.remainingSeconds,
        isTimerRunning: state.isTimerRunning,
      }),
    }
  )
);
