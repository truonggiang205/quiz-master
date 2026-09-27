import { apiClient } from './api';

export const reportService = {
  createReport: async (data: {
    title: string;
    description: string;
    type: string;
    priority: string;
    browser: string;
    screenshotUrl?: string | null;
  }) => {
    const res = await apiClient.post('/reports', data);
    return res.data;
  },

  getAllReports: async () => {
    const res = await apiClient.get('/reports');
    return res.data?.data || [];
  },

  updateStatus: async (id: string, status: 'PENDING' | 'RESOLVED') => {
    const res = await apiClient.patch(`/reports/${id}/status`, { status });
    return res.data;
  },

  deleteReport: async (id: string) => {
    const res = await apiClient.delete(`/reports/${id}`);
    return res.data;
  },
};
