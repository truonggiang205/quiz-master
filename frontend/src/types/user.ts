export type UserRole = 'TEACHER' | 'STUDENT' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  school?: string;
  createdAt?: string;
  isActive?: boolean;
}
