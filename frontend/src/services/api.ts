import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('quizmaster_auth_token');
    const userRaw = localStorage.getItem('quizmaster_auth_user');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // Ignore storage parse error
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('quizmaster_auth_token');
      localStorage.removeItem('quizmaster_auth_user');
      // Use location reload/redirect to force clear state
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
