import { create } from 'zustand';
import { Quiz } from '../types/quiz';
import { Question } from '../types/question';

interface QuizTakingState {
  currentQuiz: Quiz | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string[]>; // questionId -> array of selected optionIds
  essayAnswers: Record<string, string>; // questionId -> uploaded image url
  flaggedQuestionIds: string[]; // questionIds marked for review
  remainingSeconds: number;
  isTimerRunning: boolean;
  isSubmitModalOpen: boolean;

  // Actions
  initQuizTaking: (quiz: Quiz, questions: Question[]) => void;
  selectSingleAnswer: (questionId: string, optionId: string) => void;
  toggleMultipleAnswer: (questionId: string, optionId: string) => void;
  setEssayAnswer: (questionId: string, url: string) => void;
  toggleFlagQuestion: (questionId: string) => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  decrementTimer: () => void;
  setSubmitModalOpen: (isOpen: boolean) => void;
  resetExam: () => void;
}

export const useQuizStore = create<QuizTakingState>((set, get) => ({
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

  setEssayAnswer: (questionId: string, url: string) => {
    set((state) => ({
      essayAnswers: {
        ...state.essayAnswers,
        [questionId]: url,
      },
    }));
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
}));
