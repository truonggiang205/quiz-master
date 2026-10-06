import { apiClient } from './api';

export interface TeacherDashboardParams {
  periodDays?: number;
  quizId?: string;
  subject?: string;
  classId?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface TeacherSubmissionsParams {
  quizId?: string;
  studentId?: string;
  scoreMin?: number;
  scoreMax?: number;
  date?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface TeacherStudentsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface StudentDashboardParams {
  subject?: string;
  periodDays?: number;
  search?: string;
}

export const dashboardService = {
  async getTeacherDashboard(params: TeacherDashboardParams = {}) {
    const res = await apiClient.get('/dashboard/teacher', { params });
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải số liệu bảng điều khiển giảng viên');
  },

  async getTeacherSubmissions(params: TeacherSubmissionsParams = {}) {
    const res = await apiClient.get('/dashboard/teacher/submissions', { params });
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải danh sách bài nộp');
  },

  async getTeacherStudents(params: TeacherStudentsParams = {}) {
    const res = await apiClient.get('/dashboard/teacher/students', { params });
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải danh sách học sinh');
  },

  async getStudentDashboard(params: StudentDashboardParams = {}) {
    const res = await apiClient.get('/dashboard/student', { params });
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải số liệu góc học tập');
  },
};
