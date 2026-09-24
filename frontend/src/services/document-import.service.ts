import { apiClient } from './api';

export interface ParsedOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  id: string;
  questionNumber: number;
  content: string;
  options: ParsedOption[];
  correctAnswer: string | null;
  warnings: string[];
  status?: 'VALID' | 'WARNING' | 'ERROR';
}

export interface ValidationSummary {
  total: number;
  valid: number;
  warning: number;
  error: number;
}

export interface DocumentImportSession {
  id: string;
  originalFileName: string;
  fileType: string;
  status: string;
  summary: ValidationSummary;
  rawData: ParsedQuestion[];
  createdAt: string;
}

export const documentImportService = {
  uploadFile: async (file: File): Promise<{ data: DocumentImportSession }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/document-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  
  getSession: async (id: string): Promise<{ data: DocumentImportSession }> => {
    const res = await apiClient.get(`/document-import/${id}`);
    return res.data;
  },
  
  updateSession: async (id: string, questions: ParsedQuestion[]): Promise<{ data: DocumentImportSession }> => {
    const res = await apiClient.put(`/document-import/${id}`, { questions });
    return res.data;
  },
  
  confirmImport: async (id: string, quizId?: string) => {
    const res = await apiClient.post(`/document-import/${id}/confirm`, { quizId });
    return res.data;
  }
};
