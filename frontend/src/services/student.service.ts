import { apiClient } from './api';
import { User } from '../types/user';

export const StudentService = {
  getMyStudents: async (): Promise<User[]> => {
    const res = await apiClient.get('/students/my-students');
    return res.data.data;
  },

  inviteStudent: async (email: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/students/invite', { email });
    return res.data;
  },

  acceptInvite: async (teacherId: string): Promise<{ success: boolean; teacherName: string }> => {
    const res = await apiClient.post('/students/accept-invite', { teacherId });
    return res.data.data;
  },

  removeStudent: async (studentId: string): Promise<void> => {
    await apiClient.delete(`/students/${studentId}`);
  },
};
