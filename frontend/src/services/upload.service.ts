import axios from 'axios';
import { apiClient } from './api';

export const uploadService = {
  async uploadFile(file: File | Blob, folder?: string): Promise<{ url: string }> {
    const formData = new FormData();
    // Explicit filename to avoid issues with bare Blobs
    formData.append('file', file, 'avatar.jpg');
    if (folder) {
      formData.append('folder', folder);
    }

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

  async uploadBase64(base64Str: string, folder?: string): Promise<{ url: string }> {
    const token = localStorage.getItem('quizmaster_auth_token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = apiUrl.replace(/\/+$/, '');
    const response = await axios.post(
      `${baseUrl}/upload/base64`,
      { image: base64Str, folder },
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
