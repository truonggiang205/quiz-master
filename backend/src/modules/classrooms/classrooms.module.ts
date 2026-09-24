import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassEntity } from '../../entities/class.entity.js';
import { UserEntity } from '../../entities/user.entity.js';
import { ClassroomsController } from './classrooms.controller.js';
import { ClassroomsService } from './classrooms.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ClassEntity, UserEntity])],
  controllers: [ClassroomsController],
  providers: [ClassroomsService],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
