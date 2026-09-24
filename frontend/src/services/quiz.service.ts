import { apiClient } from './api';
import { Quiz, CreateQuizInput } from '../types/quiz';
import { Question } from '../types/question';
import { MOCK_QUIZZES } from '../mocks/quizzes';
import { MOCK_QUESTIONS } from '../mocks/questions';

// Local cache for in-browser fallback
let localQuizzes: Quiz[] = [...MOCK_QUIZZES];
let localQuestions: Question[] = [...MOCK_QUESTIONS];

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    try {
      const res = await apiClient.get('/quizzes');
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return localQuizzes;
  },

  async getQuizById(id: string): Promise<Quiz | undefined> {
    try {
      const res = await apiClient.get(`/quizzes/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return localQuizzes.find((q) => q.id === id);
  },

  async createQuiz(input: CreateQuizInput): Promise<Quiz> {
    try {
      const res = await apiClient.post('/quizzes', input);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title: input.title,
      description: input.description || '',
      subject: input.subject,
      durationMinutes: input.durationMinutes,
      status: 'DRAFT',
      startTime: input.startTime || new Date().toISOString(),
      endTime: input.endTime || new Date(Date.now() + 30 * 86400000).toISOString(),
      totalAttempts: input.totalAttempts || 1,
      shuffleQuestions: input.shuffleQuestions ?? true,
      shuffleAnswers: input.shuffleAnswers ?? true,
      showScoreImmediately: input.showScoreImmediately ?? true,
      showCorrectAnswers: input.showCorrectAnswers ?? true,
      showExplanation: input.showExplanation ?? true,
      answerReleaseAt: input.answerReleaseAt || new Date(Date.now() + 2 * 3600000).toISOString(),
      teacherId: 'user-teacher-1',
      teacherName: 'Cô Nguyễn Thu Hà',
      questionCount: 0,
      totalScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localQuizzes.unshift(newQuiz);
    return newQuiz;
  },

  async updateQuiz(id: string, input: Partial<CreateQuizInput>): Promise<Quiz | undefined> {
    try {
      const res = await apiClient.patch(`/quizzes/${id}`, input);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const idx = localQuizzes.findIndex((q) => q.id === id);
    if (idx !== -1) {
      localQuizzes[idx] = {
        ...localQuizzes[idx],
        ...input,
        updatedAt: new Date().toISOString(),
      };
      return localQuizzes[idx];
    }
    return undefined;
  },

  async deleteQuiz(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/quizzes/${id}`);
      return true;
    } catch {
      localQuizzes = localQuizzes.filter((q) => q.id !== id);
      return true;
    }
  },

  async publishQuiz(id: string): Promise<Quiz | undefined> {
    try {
      const res = await apiClient.post(`/quizzes/${id}/publish`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const quiz = localQuizzes.find((q) => q.id === id);
    if (quiz) {
      quiz.status = 'PUBLISHED';
      return quiz;
    }
    return undefined;
  },

  async unpublishQuiz(id: string): Promise<Quiz | undefined> {
    try {
      const res = await apiClient.post(`/quizzes/${id}/unpublish`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const quiz = localQuizzes.find((q) => q.id === id);
    if (quiz) {
      quiz.status = 'DRAFT';
      return quiz;
    }
    return undefined;
  },

  async getQuestions(quizId: string, isExam = false): Promise<Question[]> {
    try {
      const res = await apiClient.get(`/quizzes/${quizId}/questions?examMode=${isExam}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const qList = localQuestions.filter((q) => q.quizId === quizId);
    if (isExam) {
      // Mask correct answers
      return qList.map((q) => ({
        ...q,
        options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
        explanation: undefined,
      }));
    }
    return qList;
  },

  async createQuestion(quizId: string, question: Omit<Question, 'id' | 'quizId'>): Promise<Question> {
    try {
      const res = await apiClient.post(`/quizzes/${quizId}/questions`, question);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    const newQ: Question = {
      id: `q-${Date.now()}`,
      quizId,
      ...question,
    };
    localQuestions.push(newQ);
    const quiz = localQuizzes.find((q) => q.id === quizId);
    if (quiz) {
      quiz.questionCount += 1;
      quiz.totalScore += question.score || 2;
    }
    return newQ;
  },

  async deleteQuestion(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/questions/${id}`);
      return true;
    } catch {
      localQuestions = localQuestions.filter((q) => q.id !== id);
      return true;
    }
  },

  async getQuestionBank(): Promise<Question[]> {
    try {
      const res = await apiClient.get('/questions/bank');
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {}
    return [];
  },

  async saveToBank(question: Omit<Question, 'id' | 'quizId'>): Promise<Question | null> {
    try {
      const res = await apiClient.post('/questions/bank', question);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {}
    return null;
  },

  async importFromBank(quizId: string, questionIds: string[]): Promise<Question[]> {
    try {
      const res = await apiClient.post(`/quizzes/${quizId}/import-bank`, { questionIds });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {}
    return [];
  },

  async parseDocxQuestions(file: File): Promise<Question[]> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/parse-docx', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error) {
      console.error('Lỗi khi phân tích file DOCX:', error);
      throw error;
    }
    return [];
  },
};
