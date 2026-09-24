import axios from 'axios';
import { apiClient } from './api';

export const uploadService = {
  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('quizmaster_auth_token');
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/upload`,
      formData,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data?.data || response.data;
  },

  async parseDocument(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('quizmaster_auth_token');
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/upload/parse-document`,
      formData,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );

    return response.data?.data || response.data;
  },
};
