import { apiClient } from './api';
import { Quiz, CreateQuizInput } from '../types/quiz';
import { Question } from '../types/question';

export const quizService = {
  async getQuizzes(): Promise<Quiz[]> {
    const res = await apiClient.get('/quizzes');
    if (res.data?.data) {
      return res.data.data;
    }
    return [];
  },

  async getQuizById(id: string): Promise<Quiz | undefined> {
    const res = await apiClient.get(`/quizzes/${id}`);
    if (res.data?.data) {
      return res.data.data;
    }
    return undefined;
  },

  async createQuiz(input: CreateQuizInput): Promise<Quiz> {
    const res = await apiClient.post('/quizzes', input);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to create quiz');
  },

  async updateQuiz(id: string, input: Partial<CreateQuizInput>): Promise<Quiz | undefined> {
    const res = await apiClient.patch(`/quizzes/${id}`, input);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to update quiz');
  },

  async deleteQuiz(id: string): Promise<boolean> {
    await apiClient.delete(`/quizzes/${id}`);
    return true;
  },

  async publishQuiz(id: string): Promise<Quiz | undefined> {
    const res = await apiClient.post(`/quizzes/${id}/publish`);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to publish quiz');
  },

  async unpublishQuiz(id: string): Promise<Quiz | undefined> {
    const res = await apiClient.post(`/quizzes/${id}/unpublish`);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to unpublish quiz');
  },

  async getQuestions(quizId: string, isExam = false): Promise<Question[]> {
    const res = await apiClient.get(`/quizzes/${quizId}/questions?examMode=${isExam}`);
    if (res.data?.data) {
      return res.data.data;
    }
    return [];
  },

  async createQuestion(quizId: string, question: Omit<Question, 'id' | 'quizId'>): Promise<Question> {
    const res = await apiClient.post(`/quizzes/${quizId}/questions`, question);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to create question');
  },

  async updateQuestion(id: string, question: Partial<Question>): Promise<Question> {
    const res = await apiClient.patch(`/questions/${id}`, question);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to update question');
  },

  async deleteQuestion(id: string): Promise<boolean> {
    await apiClient.delete(`/questions/${id}`);
    return true;
  },

  async getQuestionBank(): Promise<Question[]> {
    const res = await apiClient.get('/questions/bank');
    if (res.data?.data) {
      return res.data.data;
    }
    return [];
  },

  async saveToBank(question: Omit<Question, 'id' | 'quizId'>): Promise<Question | null> {
    const res = await apiClient.post('/questions/bank', question);
    if (res.data?.data) {
      return res.data.data;
    }
    return null;
  },

  async importFromBank(quizId: string, questionIds: string[]): Promise<Question[]> {
    const res = await apiClient.post(`/quizzes/${quizId}/import-bank`, { questionIds });
    if (res.data?.data) {
      return res.data.data;
    }
    return [];
  },

  async syncQuestionsDiff(
    quizId: string,
    diff: { created?: any[]; updated?: { id: string; changes: any }[]; deletedIds?: string[] },
  ): Promise<any> {
    const res = await apiClient.post(`/quizzes/${quizId}/questions/sync`, diff);
    return res.data?.data;
  },

  async updateQuestionInQuiz(quizId: string, questionId: string, question: Partial<Question>): Promise<Question> {
    const res = await apiClient.patch(`/quizzes/${quizId}/questions/${questionId}`, question);
    return res.data?.data;
  },

  async saveToBankFromExam(
    examId: string,
    questionIds: string[],
    subject?: string,
  ): Promise<{ savedCount: number; duplicateCount: number; totalRequested: number }> {
    const res = await apiClient.post('/questions/bank/from-exam', {
      examId,
      questionIds,
      subject,
    });
    return res.data?.data;
  },

  async parseDocxQuestions(file: File): Promise<Question[]> {
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
    return [];
  },
};
