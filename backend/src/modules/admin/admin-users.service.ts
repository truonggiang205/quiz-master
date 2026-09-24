import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async getUsers(role?: string, search?: string) {
    const qb = this.userRepo.createQueryBuilder('user')
      .select([
        'user.id', 'user.name', 'user.email', 'user.role', 
        'user.dob', 'user.gender', 'user.phone', 'user.school',
        'user.isActive', 'user.createdAt'
      ])
      .orderBy('user.createdAt', 'DESC');

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    if (search) {
      qb.andWhere('(user.name LIKE :search OR user.email LIKE :search)', { search: `%${search}%` });
    }

    return qb.getMany();
  }

  async toggleUserStatus(id: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Không thể khóa tài khoản Admin');
    }

    user.isActive = !user.isActive;
    return this.userRepo.save(user);
  }

  async resetUserPassword(id: string, newPassword?: string) {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Không thể đặt lại mật khẩu của Admin qua API này');
    }

    const passwordToSet = newPassword || '123456';
    user.password = passwordToSet;
    await this.userRepo.save(user);

    return { id, email: user.email, newPassword: passwordToSet };
  }
}
