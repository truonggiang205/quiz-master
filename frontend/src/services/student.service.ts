import { apiClient } from './api';
import {
  TeacherStudent,
  CreateExternalStudentPayload,
  UpdateTeacherStudentPayload,
  LinkAccountPayload,
  StudentDetailResponse,
} from '../types/student';

export const StudentService = {
  /**
   * Lấy danh sách học sinh của giáo viên (hỗ trợ cả External và Linked Student)
   */
  getMyStudents: async (): Promise<TeacherStudent[]> => {
    try {
      const res = await apiClient.get('/teacher/students');
      return res.data.data;
    } catch {
      // Fallback API cũ nếu cần
      const res = await apiClient.get('/students/my-students');
      return res.data.data;
    }
  },

  /**
   * Tạo học sinh ngoài hệ thống (External Student) không cần tài khoản QuizMaster
   */
  createExternalStudent: async (
    payload: CreateExternalStudentPayload,
  ): Promise<TeacherStudent> => {
    const res = await apiClient.post('/teacher/students', payload);
    return res.data.data;
  },

  /**
   * Lấy chi tiết hồ sơ học sinh và toàn bộ lịch sử (Lịch dạy, Điểm danh, Học phí, Điểm số, Nhật ký)
   */
  getStudentDetail: async (studentId: string): Promise<StudentDetailResponse> => {
    const res = await apiClient.get(`/teacher/students/${studentId}`);
    return res.data.data;
  },

  /**
   * Cập nhật thông tin học sinh
   */
  updateStudent: async (
    studentId: string,
    payload: UpdateTeacherStudentPayload,
  ): Promise<TeacherStudent> => {
    const res = await apiClient.patch(`/teacher/students/${studentId}`, payload);
    return res.data.data;
  },

  /**
   * Xóa học sinh khỏi danh bạ quản lý của giáo viên
   */
  deleteStudent: async (studentId: string): Promise<void> => {
    await apiClient.delete(`/teacher/students/${studentId}`);
  },

  /**
   * Liên kết hồ sơ External Student với tài khoản QuizMaster hiện có
   */
  linkAccount: async (
    studentId: string,
    payload: LinkAccountPayload,
  ): Promise<TeacherStudent> => {
    const res = await apiClient.post(
      `/teacher/students/${studentId}/link-account`,
      payload,
    );
    return res.data.data;
  },

  /**
   * Hủy liên kết tài khoản QuizMaster (bảo toàn 100% lịch sử học tập & học phí)
   */
  unlinkAccount: async (studentId: string): Promise<TeacherStudent> => {
    const res = await apiClient.post(
      `/teacher/students/${studentId}/unlink-account`,
    );
    return res.data.data;
  },

  /**
   * Mời học sinh có tài khoản qua email (Legacy)
   */
  inviteStudent: async (
    email: string,
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post('/students/invite', { email });
    return res.data;
  },

  acceptInvite: async (
    teacherId: string,
  ): Promise<{ success: boolean; teacherName: string }> => {
    const res = await apiClient.post('/students/accept-invite', { teacherId });
    return res.data.data;
  },

  removeStudent: async (studentId: string): Promise<void> => {
    await apiClient.delete(`/teacher/students/${studentId}`);
  },
};
