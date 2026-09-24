import { apiClient } from './api';
import { Submission, QuizResultsResponse } from '../types/submission';
import { MOCK_SUBMISSIONS } from '../mocks/submissions';
import { MOCK_QUESTIONS } from '../mocks/questions';
import { MOCK_QUIZZES } from '../mocks/quizzes';

let localSubmissions: Submission[] = [...MOCK_SUBMISSIONS];

export const submissionService = {
  async startQuiz(quizId: string) {
    try {
      const res = await apiClient.post(`/quizzes/${quizId}/start`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error: any) {
      if (error.response) throw error;
      // Fallback
    }
    return { startedAt: new Date().toISOString() };
  },

  async submitQuiz(
    quizId: string,
    answers: { questionId: string; selectedOptionIds: string[] }[],
    timeUsedSeconds: number,
  ): Promise<Submission> {
    try {
      const res = await apiClient.post(`/quizzes/${quizId}/submit`, {
        answers,
        timeUsedSeconds,
      });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (error: any) {
      if (error.response) throw error;
      // Fallback calculation
    }

    const quiz = MOCK_QUIZZES.find((q) => q.id === quizId);
    const questions = MOCK_QUESTIONS.filter((q) => q.quizId === quizId);

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let unanswered = 0;

    const evaluatedAnswers = questions.map((q) => {
      const studentAns = answers.find((a) => a.questionId === q.id);
      const selected = studentAns?.selectedOptionIds || [];

      if (selected.length === 0) {
        unanswered++;
        return {
          questionId: q.id,
          selectedOptionIds: [],
          isCorrect: false,
          scoreAwarded: 0,
        };
      }

      const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
      const studentSorted = [...selected].sort();
      const isCorrect =
        correctIds.length === studentSorted.length &&
        correctIds.every((v, i) => v === studentSorted[i]);

      if (isCorrect) {
        correct++;
        score += q.score;
      } else {
        wrong++;
      }

      return {
        questionId: q.id,
        selectedOptionIds: selected,
        isCorrect,
        scoreAwarded: isCorrect ? q.score : 0,
      };
    });

    const maxScore = quiz?.totalScore || (questions.length * 2);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    const submission: Submission = {
      id: `sub-${Date.now()}`,
      quizId,
      quizTitle: quiz?.title || 'Bài kiểm tra',
      studentId: 'user-student-1',
      studentName: 'Trần Minh Đức',
      studentEmail: 'student@example.com',
      studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      startedAt: new Date(Date.now() - timeUsedSeconds * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      score: Number(score.toFixed(1)),
      maxScore,
      percentage,
      correctCount: correct,
      wrongCount: wrong,
      unansweredCount: unanswered,
      timeUsedSeconds,
      answers: evaluatedAnswers,
    };

    localSubmissions.unshift(submission);
    return submission;
  },

  async getSubmissionById(id: string): Promise<Submission | undefined> {
    try {
      const res = await apiClient.get(`/submissions/${id}`);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    const sub = localSubmissions.find((s) => s.id === id);
    if (!sub) return undefined;

    const quiz = MOCK_QUIZZES.find((q) => q.id === sub.quizId);
    const questions = MOCK_QUESTIONS.filter((q) => q.quizId === sub.quizId);

    const now = new Date();
    const isAnswerReleased = !quiz?.answerReleaseAt || new Date(quiz.answerReleaseAt) <= now;

    const detailedAnswers = sub.answers.map((ans) => {
      const q = questions.find((item) => item.id === ans.questionId);
      return {
        ...ans,
        questionContent: q?.content || '',
        questionType: q?.type || 'SINGLE_CHOICE',
        score: q?.score || 0,
        options: q ? q.options : [],
        explanation: isAnswerReleased ? q?.explanation : undefined,
      };
    });

    return {
      ...sub,
      isAnswerReleased,
      answerReleaseAt: quiz?.answerReleaseAt,
      detailedAnswers,
    };
  },

  async getQuizResults(quizId: string): Promise<QuizResultsResponse> {
    try {
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
    } catch {
      // Fallback
    }

    const subs = localSubmissions.filter((s) => s.quizId === quizId);
    const scores = subs.map((s) => s.score);
    const avg = scores.length > 0 ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0;

    return {
      quizId,
      totalSubmissions: subs.length,
      statistics: {
        averageScore: avg,
        highestScore: scores.length > 0 ? Math.max(...scores) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
        completionRate: 100,
      },
      submissions: subs,
      unsubmittedStudents: [],
    };
  },

  async getMySubmissions(): Promise<Submission[]> {
    try {
      const res = await apiClient.get('/student/submissions');
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return localSubmissions.filter((s) => s.studentId === 'user-student-1');
  },

  async gradeSubmission(
    submissionId: string,
    grades: { questionId: string; scoreAwarded: number }[]
  ): Promise<Submission> {
    const res = await apiClient.post(`/submissions/${submissionId}/grade`, { grades });
    return res.data?.data;
  },
};
