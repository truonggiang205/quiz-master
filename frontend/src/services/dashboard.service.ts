import { apiClient } from './api';
import { MOCK_QUIZZES } from '../mocks/quizzes';
import { MOCK_SUBMISSIONS } from '../mocks/submissions';

export const dashboardService = {
  async getTeacherDashboard() {
    try {
      const res = await apiClient.get('/dashboard/teacher');
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    const totalQuizzes = MOCK_QUIZZES.length;
    const activeQuizzes = MOCK_QUIZZES.filter((q) => q.status === 'PUBLISHED').length;
    const totalSubmissions = MOCK_SUBMISSIONS.length;
    const avgScore =
      totalSubmissions > 0
        ? Number(
            (
              MOCK_SUBMISSIONS.reduce((s, item) => s + item.score, 0) /
              totalSubmissions
            ).toFixed(1),
          )
        : 0;

    return {
      stats: {
        totalQuizzes,
        activeQuizzes,
        totalStudents: 0,
        totalSubmissions,
        averageScore: avgScore,
      },
      charts: {
        scoreDistribution: [
          { range: '< 5.0', count: 0 },
          { range: '5.0 - 6.5', count: 0 },
          { range: '6.5 - 8.0', count: 0 },
          { range: '8.0 - 9.0', count: 0 },
          { range: '9.0 - 10', count: 0 },
        ],
        activityTrend: [
          { day: 'Thứ 2', submissions: 0, avgScore: 0 },
          { day: 'Thứ 3', submissions: 0, avgScore: 0 },
          { day: 'Thứ 4', submissions: 0, avgScore: 0 },
          { day: 'Thứ 5', submissions: 0, avgScore: 0 },
          { day: 'Thứ 6', submissions: 0, avgScore: 0 },
          { day: 'Thứ 7', submissions: 0, avgScore: 0 },
          { day: 'Chủ Nhật', submissions: 0, avgScore: 0 },
        ],
      },
      recentQuizzes: MOCK_QUIZZES.slice(0, 4),
      recentSubmissions: MOCK_SUBMISSIONS.slice(0, 5),
    };
  },

  async getStudentDashboard() {
    try {
      const res = await apiClient.get('/dashboard/student');
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }

    const mySubs = MOCK_SUBMISSIONS.filter((s) => s.studentId === 'user-student-1');
    const completedIds = new Set(mySubs.map((s) => s.quizId));
    const available = MOCK_QUIZZES.filter(
      (q) => q.status === 'PUBLISHED' && !completedIds.has(q.id),
    );

    const avg =
      mySubs.length > 0
        ? Number((mySubs.reduce((s, item) => s + item.score, 0) / mySubs.length).toFixed(1))
        : 0;

    return {
      stats: {
        availableCount: available.length,
        completedCount: mySubs.length,
        averageScore: avg,
        highestScore: mySubs.length > 0 ? Math.max(...mySubs.map((s) => s.score)) : 0,
      },
      availableQuizzes: available,
      recentSubmissions: mySubs,
    };
  },
};
