import { apiClient } from './api';
import { User } from '../types/user';

export const adminService = {
  async getUsers(role?: string, search?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);

    const res = await apiClient.get(`/admin/users?${params.toString()}`);
    return res.data?.data || [];
  },

  async toggleUserStatus(id: string): Promise<User> {
    const res = await apiClient.patch(`/admin/users/${id}/toggle-status`);
    return res.data?.data;
  },

  async resetUserPassword(id: string, newPassword?: string): Promise<any> {
    const res = await apiClient.patch(`/admin/users/${id}/reset-password`, { newPassword });
    return res.data?.data;
  },

  async getAnalytics(): Promise<any> {
    const res = await apiClient.get('/admin/analytics/dashboard');
    return res.data?.data;
  },

  async getQuizzes(search?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const res = await apiClient.get(`/admin/content/quizzes?${params.toString()}`);
    return res.data?.data || [];
  },

  async deleteQuiz(id: string): Promise<any> {
    const res = await apiClient.delete(`/admin/content/quizzes/${id}`);
    return res.data?.data;
  },

  async getSettings(): Promise<{ allowRegistration: boolean; maintenanceMode: boolean }> {
    const res = await apiClient.get('/admin/settings');
    return res.data?.data;
  },

  async updateSettings(updates: any): Promise<any> {
    const res = await apiClient.patch('/admin/settings', updates);
    return res.data?.data;
  },
};
