import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BugReportEntity } from '../../entities/bug-report.entity.js';
import { CreateBugReportDto, UpdateBugReportStatusDto } from './bug-report.dto.js';

@Injectable()
export class BugReportService {
  constructor(
    @InjectRepository(BugReportEntity)
    private readonly bugReportRepo: Repository<BugReportEntity>,
  ) {}

  async create(userId: string, dto: CreateBugReportDto) {
    const report = this.bugReportRepo.create({
      ...dto,
      userId,
    });
    return this.bugReportRepo.save(report);
  }

  async getAllReports() {
    return this.bugReportRepo.find({
      relations: { user: true },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateStatus(id: string, dto: UpdateBugReportStatusDto) {
    const report = await this.bugReportRepo.findOneBy({ id });
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    report.status = dto.status;
    return this.bugReportRepo.save(report);
  }

  async deleteReport(id: string) {
    const report = await this.bugReportRepo.findOneBy({ id });
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    await this.bugReportRepo.remove(report);
    return { id, message: 'Đã xóa báo cáo' };
  }
}
