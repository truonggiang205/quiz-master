import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const TEST_CONFIG = {
  BASE_URL: process.env.E2E_BASE_URL || 'http://localhost:5173',
  API_URL: process.env.E2E_API_URL || 'http://localhost:3333/api',
  STORAGE_STATE_DIR: path.resolve(__dirname, '../.auth'),
};

export const TEST_USERS = {
  ADMIN: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@quizmaster.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'Password@123',
    role: 'ADMIN',
  },
  TEACHER: {
    email: process.env.E2E_TEACHER_EMAIL || 'teacher@quizmaster.com',
    password: process.env.E2E_TEACHER_PASSWORD || 'Password@123',
    role: 'TEACHER',
  },
  STUDENT: {
    email: process.env.E2E_STUDENT_EMAIL || 'student@quizmaster.com',
    password: process.env.E2E_STUDENT_PASSWORD || 'Password@123',
    role: 'STUDENT',
  },
};

export const STORAGE_PATHS = {
  ADMIN: path.join(TEST_CONFIG.STORAGE_STATE_DIR, 'admin.json'),
  TEACHER: path.join(TEST_CONFIG.STORAGE_STATE_DIR, 'teacher.json'),
  STUDENT: path.join(TEST_CONFIG.STORAGE_STATE_DIR, 'student.json'),
};
