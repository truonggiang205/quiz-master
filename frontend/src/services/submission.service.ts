import { apiClient } from './api';
import { Submission, QuizResultsResponse } from '../types/submission';

export const submissionService = {
  async startQuiz(quizId: string) {
    const res = await apiClient.post(`/quizzes/${quizId}/start`);
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to start quiz');
  },

  async submitQuiz(
    quizId: string,
    answers: { questionId: string; selectedOptionIds: string[] }[],
    timeUsedSeconds: number,
  ): Promise<Submission> {
    const res = await apiClient.post(`/quizzes/${quizId}/submit`, {
      answers,
      timeUsedSeconds,
    });
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Failed to submit quiz');
  },

  async getSubmissionById(id: string): Promise<Submission | undefined> {
    const res = await apiClient.get(`/submissions/${id}`);
    if (res.data?.data) {
      return res.data.data;
    }
    return undefined;
  },

  async getQuizResults(quizId: string): Promise<QuizResultsResponse> {
    const res = await apiClient.get(`/quizzes/${quizId}/results`);
    if (res.data?.data) {
      const d = res.data.data;
      // Map backend format to frontend format
      return {
        quizId: d.quiz?.id || quizId,
        totalSubmissions: d.stats?.totalSubmissions || d.totalSubmissions || 0,
        statistics: {
          averageScore: d.stats?.avgScore ?? d.statistics?.averageScore ?? 0,
          highestScore: d.stats?.highestScore ?? d.statistics?.highestScore ?? 0,
          lowestScore: d.stats?.lowestScore ?? d.statistics?.lowestScore ?? 0,
          completionRate: d.stats?.passRate ?? d.statistics?.completionRate ?? 100,
        },
        submissions: d.submissions || [],
        unsubmittedStudents: d.unsubmittedStudents || [],
      };
    }
    throw new Error('Failed to get quiz results');
  },

  async getMySubmissions(): Promise<Submission[]> {
    const res = await apiClient.get('/student/submissions');
    if (res.data?.data) {
      return res.data.data;
    }
    return [];
  },

  async gradeSubmission(
    submissionId: string,
    grades: { questionId: string; scoreAwarded: number }[]
  ): Promise<Submission> {
    const res = await apiClient.post(`/submissions/${submissionId}/grade`, { grades });
    return res.data?.data;
  },

  async regradeQuizEssays(quizId: string): Promise<{ regradedCount: number; message: string }> {
    const res = await apiClient.post(`/quizzes/${quizId}/regrade-essays`);
    return res.data?.data;
  },
};
