import { apiClient } from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'GENERAL' | 'PERSONAL';
  targetRole: 'ALL' | 'TEACHER' | 'STUDENT' | 'NONE';
  recipientId: string | null;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
}

export const notificationService = {
  async getMyNotifications(): Promise<Notification[]> {
    const res = await apiClient.get('/notifications');
    return res.data?.data || [];
  },

  async markAsRead(id: string): Promise<any> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data?.data;
  },

  async markAllAsRead(): Promise<any> {
    const res = await apiClient.post('/notifications/read-all');
    return res.data?.data;
  },
};
