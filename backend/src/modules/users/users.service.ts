import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa bởi quản trị viên');
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa bởi quản trị viên');
    }

    const { dob, ...rest } = dto;
    Object.assign(user, rest);
    if (dob !== undefined) {
      user.dob = dob ? new Date(dob) : null;
    }
    return this.userRepo.save(user);
  }
}
