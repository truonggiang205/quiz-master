import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('quizmaster_auth_token');
    const userRaw = localStorage.getItem('quizmaster_auth_user');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    if (userRaw) {
      const user = JSON.parse(userRaw);
      if (user?.role) {
        config.headers['x-user-role'] = user.role;
      } else {
        delete config.headers['x-user-role'];
      }
    } else {
      delete config.headers['x-user-role'];
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
      try {
        localStorage.removeItem('quiz-master-taking-storage');
      } catch {
        // Ignore
      }
      // Use location reload/redirect to force clear state
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
