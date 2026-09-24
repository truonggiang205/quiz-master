import { apiClient } from './api';

export interface Appeal {
  id: string;
  submissionId: string;
  studentId: string;
  teacherId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  teacherReply: string | null;
  createdAt: string;
  submission?: any;
  student?: any;
}

export const appealService = {
  async getMyAppeals(): Promise<Appeal[]> {
    const res = await apiClient.get('/appeals');
    return res.data?.data || [];
  },

  async createAppeal(submissionId: string, reason: string): Promise<Appeal> {
    const res = await apiClient.post(`/appeals/submissions/${submissionId}`, { reason });
    return res.data?.data;
  },

  async replyAppeal(id: string, status: 'APPROVED' | 'REJECTED', reply: string): Promise<Appeal> {
    const res = await apiClient.patch(`/appeals/${id}/reply`, { status, reply });
    return res.data?.data;
  },
};
