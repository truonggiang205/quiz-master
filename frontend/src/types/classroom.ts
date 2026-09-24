import { User } from './user';

export interface Classroom {
  id: string;
  name: string;
  description: string;
  subject: string;
  inviteCode: string;
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    avatar?: string;
    email?: string;
  };
  students?: User[];
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;
}
