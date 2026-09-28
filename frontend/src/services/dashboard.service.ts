import { apiClient } from './api';

export const dashboardService = {
  async getTeacherDashboard() {
    const res = await apiClient.get('/dashboard/teacher');
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải số liệu bảng điều khiển giảng viên');
  },

  async getStudentDashboard() {
    const res = await apiClient.get('/dashboard/student');
    if (res.data?.data) {
      return res.data.data;
    }
    throw new Error('Không thể tải số liệu góc học tập');
  },
};
