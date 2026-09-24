import { apiClient } from './api';
import { Classroom } from '../types/classroom';

export const ClassroomService = {
  // --- Teacher Actions ---
  createClass: async (name: string, description?: string, subject?: string, isPrivate?: boolean): Promise<Classroom> => {
    const res = await apiClient.post('/classrooms', { name, description, subject, isPrivate: isPrivate ?? false });
    return res.data.data;
  },

  getTeacherClasses: async (): Promise<Classroom[]> => {
    const res = await apiClient.get('/classrooms/teacher');
    return res.data.data;
  },

  removeStudent: async (classId: string, studentId: string): Promise<void> => {
    await apiClient.delete(`/classrooms/${classId}/students/${studentId}`);
  },

  // --- Student Actions ---
  joinClass: async (inviteCode: string): Promise<{ success: boolean; classId: string; className: string }> => {
    const res = await apiClient.post('/classrooms/join', { inviteCode });
    return res.data.data;
  },

  getStudentClasses: async (): Promise<Classroom[]> => {
    const res = await apiClient.get('/classrooms/student');
    return res.data.data;
  },

  // --- Common Actions ---
  getClassDetails: async (classId: string): Promise<Classroom> => {
    const res = await apiClient.get(`/classrooms/${classId}`);
    return res.data.data;
  },
};
