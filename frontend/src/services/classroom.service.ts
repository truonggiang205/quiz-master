import { apiClient } from './api';
import { Classroom, ClassStudent, ImportStudentResult } from '../types/classroom';

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

  getClassStudents: async (classId: string, params?: { search?: string; status?: string }): Promise<ClassStudent[]> => {
    const res = await apiClient.get(`/classrooms/${classId}/students`, { params });
    return res.data.data;
  },

  importStudents: async (classId: string, file: File): Promise<ImportStudentResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/classrooms/${classId}/students/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data;
  },

  exportStudents: async (classId: string): Promise<Blob> => {
    const res = await apiClient.get(`/classrooms/${classId}/students/export`, {
      responseType: 'blob',
    });
    return res.data;
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
