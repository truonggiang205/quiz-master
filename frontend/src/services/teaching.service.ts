import { apiClient } from './api';
import type {
  Lesson,
  CreateLessonPayload,
  UpdateLessonPayload,
  LearningLog,
  SaveLearningLogPayload,
  TuitionRow,
  TuitionDetail,
  ScoreRecord,
  ScoreMatrixResponse,
  ImportResult,
  TuitionStatus,
  AssessmentType,
  PaymentMethod,
  BulkTuitionAdjustmentPayload,
  BulkPaymentPayload,
} from '../types/teaching';

export const TeachingService = {
  // ==================== SCHEDULER ====================
  getLessons: async (params?: {
    classId?: string;
    studentId?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
    status?: string;
  }): Promise<Lesson[]> => {
    const res = await apiClient.get('/teacher/schedule', { params });
    return res.data.data;
  },

  getLessonById: async (id: string): Promise<Lesson> => {
    const res = await apiClient.get(`/teacher/schedule/${id}`);
    return res.data.data;
  },

  createLesson: async (payload: CreateLessonPayload): Promise<Lesson | Lesson[]> => {
    const res = await apiClient.post('/teacher/schedule', payload);
    return res.data.data;
  },

  updateLesson: async (id: string, payload: UpdateLessonPayload): Promise<Lesson> => {
    const res = await apiClient.patch(`/teacher/schedule/${id}`, payload);
    return res.data.data;
  },

  deleteLesson: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/teacher/schedule/${id}`);
    return res.data.data;
  },

  // ==================== LEARNING LOGS ====================
  getLogs: async (params?: {
    month?: string;
    classId?: string;
    studentId?: string;
    lessonId?: string;
    search?: string;
  }): Promise<LearningLog[]> => {
    const res = await apiClient.get('/teacher/learning-logs', { params });
    return res.data.data;
  },

  getLogById: async (id: string): Promise<LearningLog> => {
    const res = await apiClient.get(`/teacher/learning-logs/${id}`);
    return res.data.data;
  },

  saveLog: async (payload: SaveLearningLogPayload): Promise<LearningLog> => {
    const res = await apiClient.post('/teacher/learning-logs', payload);
    return res.data.data;
  },

  bulkSaveLogs: async (logs: SaveLearningLogPayload[]): Promise<LearningLog[]> => {
    const res = await apiClient.post('/teacher/learning-logs/bulk', { logs });
    return res.data.data;
  },

  exportLogs: async (params?: {
    month?: string;
    classId?: string;
    studentId?: string;
  }): Promise<Blob> => {
    const res = await apiClient.get('/teacher/learning-logs/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  importLogs: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/teacher/learning-logs/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  // ==================== TUITION ====================
  getTuitionList: async (params?: {
    month?: string;
    classId?: string;
    studentId?: string;
    status?: TuitionStatus;
  }): Promise<TuitionRow[]> => {
    const res = await apiClient.get('/teacher/tuition', { params });
    return res.data.data;
  },

  getTuitionDetail: async (id: string): Promise<TuitionDetail> => {
    const res = await apiClient.get(`/teacher/tuition/${id}`);
    return res.data.data;
  },

  addAdjustment: async (
    id: string,
    payload: { type: 'SURCHARGE' | 'DISCOUNT'; amount: number; reason: string },
  ): Promise<TuitionDetail> => {
    const res = await apiClient.post(`/teacher/tuition/${id}/adjustment`, payload);
    return res.data.data;
  },

  recordPayment: async (
    id: string,
    payload: {
      amount: number;
      paymentDate: string;
      paymentMethod?: PaymentMethod;
      note?: string;
    },
  ): Promise<TuitionDetail> => {
    const res = await apiClient.post(`/teacher/tuition/${id}/payment`, payload);
    return res.data.data;
  },

  exportTuition: async (params?: {
    month?: string;
    classId?: string;
    status?: TuitionStatus;
  }): Promise<Blob> => {
    const res = await apiClient.get('/teacher/tuition/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  bulkAdjustment: async (payload: BulkTuitionAdjustmentPayload): Promise<TuitionDetail[]> => {
    const res = await apiClient.post('/teacher/tuition/bulk-adjustment', payload);
    return res.data.data;
  },

  bulkPayment: async (payload: BulkPaymentPayload): Promise<TuitionDetail[]> => {
    const res = await apiClient.post('/teacher/tuition/bulk-payment', payload);
    return res.data.data;
  },

  updateTuitionStatus: async (id: string, status: TuitionStatus): Promise<TuitionDetail> => {
    const res = await apiClient.patch(`/teacher/tuition/${id}/status`, { status });
    return res.data.data;
  },

  deleteAdjustment: async (adjustmentId: string): Promise<TuitionDetail> => {
    const res = await apiClient.delete(`/teacher/tuition/adjustments/${adjustmentId}`);
    return res.data.data;
  },

  // ==================== SCORES ====================
  getScores: async (params?: {
    classId?: string;
    studentId?: string;
    lessonId?: string;
    assessmentType?: AssessmentType;
    startDate?: string;
    endDate?: string;
  }): Promise<ScoreRecord[]> => {
    const res = await apiClient.get('/teacher/scores', { params });
    return res.data.data;
  },

  getClassScoreMatrix: async (classId: string): Promise<ScoreMatrixResponse> => {
    const res = await apiClient.get('/teacher/scores/matrix', {
      params: { classId },
    });
    return res.data.data;
  },

  createScore: async (payload: {
    classId: string;
    studentId: string;
    lessonId?: string | null;
    assessmentType: AssessmentType;
    assessmentName: string;
    score: number;
    maxScore?: number;
    date: string;
    comment?: string;
  }): Promise<ScoreRecord> => {
    const res = await apiClient.post('/teacher/scores', payload);
    return res.data.data;
  },

  updateScore: async (
    id: string,
    payload: {
      assessmentType?: AssessmentType;
      assessmentName?: string;
      score?: number;
      maxScore?: number;
      date?: string;
      comment?: string;
    },
  ): Promise<ScoreRecord> => {
    const res = await apiClient.patch(`/teacher/scores/${id}`, payload);
    return res.data.data;
  },

  deleteScore: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/teacher/scores/${id}`);
    return res.data.data;
  },

  exportScores: async (params?: {
    classId?: string;
    studentId?: string;
  }): Promise<Blob> => {
    const res = await apiClient.get('/teacher/scores/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  importScores: async (classId: string, file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/teacher/scores/import', formData, {
      params: { classId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
};
