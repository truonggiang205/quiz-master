import { apiClient } from './api';

export const AuthService = {
  login: async (email: string, password?: string) => {
    const res = await apiClient.post('/auth/login', { email, password: password || '123456' });
    return res.data.data; // { user, token }
  },

  register: async (name: string, email: string, role: string, password?: string, dob?: string, gender?: string) => {
    const res = await apiClient.post('/auth/register', { name, email, role, password: password || '123456', dob, gender });
    return res.data.data; // { requireOtp: true, email }
  },

  verifyOtp: async (email: string, otp: string) => {
    const res = await apiClient.post('/auth/verify-otp', { email, otp });
    return res.data.data; // { user, token }
  },

  forgotPassword: async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data.data;
  },

  resetPassword: async (email: string, otp: string, newPassword: string) => {
    const res = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
    return res.data.data;
  },

  updateProfile: async (data: any) => {
    const res = await apiClient.patch('/users/me', data);
    return res.data.data;
  },
};
