import { User } from '../types/user';

export const MOCK_USERS: User[] = [
  {
    id: 'user-teacher-1',
    name: 'Giáo Viên',
    email: 'teacher@example.com',
    role: 'TEACHER',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    phone: '',
    school: '',
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'user-student-1',
    name: 'Học Sinh',
    email: 'student@example.com',
    role: 'STUDENT',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    phone: '',
    school: '',
    createdAt: '2026-02-15T09:30:00.000Z',
  },
  {
    id: 'user-admin-1',
    name: 'Quản Trị Viên',
    email: 'admin@example.com',
    role: 'ADMIN',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
    phone: '',
    school: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];
