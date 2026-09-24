import { User } from '../types/user';

export const getSalutation = (user?: Partial<User> | null): string => {
  if (!user) return '';
  
  if (user.role === 'TEACHER') {
    if (user.gender === 'MALE') return 'Thầy';
    if (user.gender === 'FEMALE') return 'Cô';
    return 'Giáo viên';
  }
  
  if (user.role === 'STUDENT') {
    if (user.gender === 'MALE') return 'Bạn';
    if (user.gender === 'FEMALE') return 'Bạn';
    return 'Học sinh';
  }
  
  return '';
};

export const formatUserName = (user?: Partial<User> | null): string => {
  if (!user || !user.name) return 'Đang cập nhật';
  return user.name;
};
