import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { TuitionItemEntity, TuitionStatus } from '../entities/tuition-item.entity.js';
import { TuitionAdjustmentEntity } from '../entities/tuition-adjustment.entity.js';
import { TuitionPaymentEntity } from '../entities/tuition-payment.entity.js';
import { LessonEntity } from '../entities/lesson.entity.js';
import { LessonParticipantEntity } from '../entities/lesson-participant.entity.js';
import { ClassEntity } from '../../../entities/class.entity.js';
import { UserEntity } from '../../../entities/user.entity.js';
import {
  CreateTuitionAdjustmentDto,
  RecordPaymentDto,
  BulkTuitionAdjustmentDto,
  BulkPaymentDto,
  UpdateTuitionStatusDto,
} from '../dto/tuition.dto.js';
import * as xlsx from 'xlsx';
import crypto from 'crypto';

export interface TuitionRowSummary {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  month: string;
  lessonCount: number;
  totalHours: number;
  baseAmount: number;
  surcharge: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: TuitionStatus;
  adjustmentsCount: number;
  paymentsCount: number;
}

@Injectable()
export class TuitionService {
  constructor(
    @InjectRepository(TuitionItemEntity)
    private readonly tuitionRepo: Repository<TuitionItemEntity>,
    @InjectRepository(TuitionAdjustmentEntity)
    private readonly adjustmentRepo: Repository<TuitionAdjustmentEntity>,
    @InjectRepository(TuitionPaymentEntity)
    private readonly paymentRepo: Repository<TuitionPaymentEntity>,
    @InjectRepository(LessonEntity)
    private readonly lessonRepo: Repository<LessonEntity>,
    @InjectRepository(LessonParticipantEntity)
    private readonly participantRepo: Repository<LessonParticipantEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepo: Repository<ClassEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Đồng bộ & tính toán học phí động cho giáo viên theo tháng.
   * Quét toàn bộ lớp học của giáo viên và các học sinh có buổi học trong tháng đó.
   */
  async syncTuitionData(teacherId: string, month: string): Promise<void> {
    const teacherClasses = await this.classRepo.find({
      where: { teacherId },
      relations: { students: true },
    });

    if (teacherClasses.length === 0) return;

    // Lấy tất cả các buổi học trong tháng của giáo viên
    const lessons = await this.lessonRepo.find({
      where: { teacherId },
    });
    const monthLessons = lessons.filter((l) => l.date.startsWith(month));
    const lessonMap = new Map(monthLessons.map((l) => [l.id, l]));

    if (monthLessons.length === 0) return;

    const lessonIds = monthLessons.map((l) => l.id);
    const participants = await this.participantRepo.find({
      where: { lessonId: In(lessonIds) },
    });

    // Gom nhóm học phí theo (classId, studentId)
    const groupedFees = new Map<string, { baseAmount: number; lessonCount: number; totalHours: number }>();

    for (const p of participants) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      const key = `${lesson.classId}__${p.studentId}`;
      const current = groupedFees.get(key) || { baseAmount: 0, lessonCount: 0, totalHours: 0 };

      // Nếu không vắng mặt (hoặc vắng nhưng có tính phí)
      if (p.attendanceStatus !== 'ABSENT') {
        current.baseAmount += Number(p.feeAmount || lesson.feePerLesson || 0);
        current.lessonCount += 1;
        current.totalHours += Number(lesson.duration || 1);
      }
      groupedFees.set(key, current);
    }

    // Đảm bảo mỗi cặp (classId, studentId) có 1 TuitionItemEntity
    for (const [key, feeInfo] of groupedFees.entries()) {
      const [classId, studentId] = key.split('__');

      let tuitionItem = await this.tuitionRepo.findOne({
        where: { teacherId, classId, studentId, month },
        relations: { adjustments: true, payments: true },
      });

      if (!tuitionItem) {
        tuitionItem = this.tuitionRepo.create({
          id: `tui-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          teacherId,
          classId,
          studentId,
          month,
          baseAmount: feeInfo.baseAmount,
          surcharge: 0,
          discount: 0,
          totalAmount: feeInfo.baseAmount,
          paidAmount: 0,
          remainingAmount: feeInfo.baseAmount,
          status: feeInfo.baseAmount === 0 ? 'PAID' : 'UNPAID',
        });
        await this.tuitionRepo.save(tuitionItem);
      } else {
        // Cập nhật lại baseAmount từ dữ liệu buổi học
        tuitionItem.baseAmount = feeInfo.baseAmount;
        await this.recalculateTuitionItem(tuitionItem);
      }
    }
  }

  async recalculateTuitionItem(item: TuitionItemEntity): Promise<TuitionItemEntity> {
    const adjustments = await this.adjustmentRepo.find({
      where: { tuitionItemId: item.id },
    });
    const payments = await this.paymentRepo.find({
      where: { tuitionItemId: item.id },
    });

    let surcharge = 0;
    let discount = 0;
    for (const adj of adjustments) {
      if (adj.type === 'SURCHARGE') surcharge += Number(adj.amount);
      if (adj.type === 'DISCOUNT') discount += Number(adj.amount);
    }

    let paid = 0;
    for (const p of payments) {
      paid += Number(p.amount);
    }

    const total = Math.max(0, Number(item.baseAmount) + surcharge - discount);
    const remaining = Math.max(0, total - paid);

    let status: TuitionStatus = 'UNPAID';
    if (paid >= total && total > 0) {
      status = 'PAID';
    } else if (paid > 0 && paid < total) {
      status = 'PARTIALLY_PAID';
    } else if (total === 0) {
      status = 'PAID';
    }

    item.surcharge = surcharge;
    item.discount = discount;
    item.totalAmount = total;
    item.paidAmount = paid;
    item.remainingAmount = remaining;
    item.status = status;

    return await this.tuitionRepo.save(item);
  }

  async getTuitionList(
    teacherId: string,
    query: {
      month?: string;
      classId?: string;
      studentId?: string;
      status?: TuitionStatus;
    },
  ): Promise<TuitionRowSummary[]> {
    const currentMonth = query.month || new Date().toISOString().substring(0, 7);

    // Tự động đồng bộ với dữ liệu buổi học của tháng
    await this.syncTuitionData(teacherId, currentMonth);

    const qb = this.tuitionRepo
      .createQueryBuilder('tui')
      .leftJoinAndSelect('tui.student', 'student')
      .leftJoinAndSelect('tui.class', 'class')
      .leftJoinAndSelect('tui.adjustments', 'adjustments')
      .leftJoinAndSelect('tui.payments', 'payments')
      .where('tui.teacherId = :teacherId', { teacherId })
      .andWhere('tui.month = :month', { month: currentMonth });

    if (query.classId) {
      qb.andWhere('tui.classId = :classId', { classId: query.classId });
    }

    if (query.studentId) {
      qb.andWhere('tui.studentId = :studentId', { studentId: query.studentId });
    }

    if (query.status) {
      qb.andWhere('tui.status = :status', { status: query.status });
    }

    qb.orderBy('student.name', 'ASC');

    const items = await qb.getMany();

    // Lấy thông tin số buổi và số giờ cho từng học sinh trong tháng
    const lessons = await this.lessonRepo.find({
      where: { teacherId },
    });
    const monthLessons = lessons.filter((l) => l.date.startsWith(currentMonth));
    const lessonIds = monthLessons.map((l) => l.id);
    let participants: LessonParticipantEntity[] = [];
    if (lessonIds.length > 0) {
      participants = await this.participantRepo.find({
        where: { lessonId: In(lessonIds) },
        relations: { lesson: true },
      });
    }

    return items.map((item) => {
      const studentParts = participants.filter(
        (p) =>
          p.studentId === item.studentId &&
          p.lesson &&
          p.lesson.classId === item.classId &&
          p.attendanceStatus !== 'ABSENT',
      );
      const lessonCount = studentParts.length;
      const totalHours = Number(
        studentParts.reduce((acc, cur) => acc + Number(cur.lesson?.duration || 1), 0).toFixed(2),
      );

      return {
        id: item.id,
        studentId: item.studentId,
        studentName: item.student?.name || '',
        studentEmail: item.student?.email || '',
        classId: item.classId,
        className: item.class?.name || '',
        month: item.month,
        lessonCount,
        totalHours,
        baseAmount: Number(item.baseAmount),
        surcharge: Number(item.surcharge),
        discount: Number(item.discount),
        totalAmount: Number(item.totalAmount),
        paidAmount: Number(item.paidAmount),
        remainingAmount: Number(item.remainingAmount),
        status: item.status,
        adjustmentsCount: item.adjustments?.length || 0,
        paymentsCount: item.payments?.length || 0,
      };
    });
  }

  async getTuitionTrend(
    teacherId: string,
    endMonth: string,
  ): Promise<{ month: string; label: string; total: number; paid: number; unpaid: number }[]> {
    const [currY, currM] = (endMonth || new Date().toISOString().substring(0, 7)).split('-').map(Number);
    const months: { month: string; label: string; total: number; paid: number; unpaid: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currY, currM - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `T${d.getMonth() + 1}`;

      await this.syncTuitionData(teacherId, mStr);

      const items = await this.tuitionRepo.find({
        where: { teacherId, month: mStr },
      });

      const total = items.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
      const paid = items.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
      const unpaid = items.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);

      months.push({
        month: mStr,
        label,
        total,
        paid,
        unpaid,
      });
    }

    return months;
  }

  async getTuitionDetail(teacherId: string, tuitionId: string) {
    const item = await this.tuitionRepo.findOne({
      where: { id: tuitionId },
      relations: { student: true, class: true, adjustments: true, payments: true },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy bản ghi học phí');
    }

    if (item.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền truy cập bản ghi học phí này');
    }

    return item;
  }

  async addAdjustment(
    teacherId: string,
    tuitionId: string,
    dto: CreateTuitionAdjustmentDto,
  ) {
    const tuition = await this.getTuitionDetail(teacherId, tuitionId);

    const adj = this.adjustmentRepo.create({
      id: `adj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      tuitionItemId: tuition.id,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      createdBy: teacherId,
    });

    await this.adjustmentRepo.save(adj);
    return await this.recalculateTuitionItem(tuition);
  }

  async recordPayment(
    teacherId: string,
    tuitionId: string,
    dto: RecordPaymentDto,
  ) {
    const tuition = await this.getTuitionDetail(teacherId, tuitionId);

    if (dto.amount > Number(tuition.remainingAmount)) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount.toLocaleString()} đ) không được vượt quá số tiền còn lại (${Number(tuition.remainingAmount).toLocaleString()} đ)`,
      );
    }

    const payment = this.paymentRepo.create({
      id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      tuitionItemId: tuition.id,
      teacherId,
      studentId: tuition.studentId,
      amount: dto.amount,
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod || 'CASH',
      note: dto.note || '',
    });

    await this.paymentRepo.save(payment);
    return await this.recalculateTuitionItem(tuition);
  }

  async deleteAdjustment(teacherId: string, adjustmentId: string) {
    const adj = await this.adjustmentRepo.findOne({
      where: { id: adjustmentId },
      relations: { tuitionItem: true },
    });
    if (!adj) {
      throw new NotFoundException('Không tìm thấy khoản điều chỉnh');
    }
    if (adj.tuitionItem.teacherId !== teacherId) {
      throw new ForbiddenException('Bạn không có quyền xóa khoản điều chỉnh này');
    }
    const tuitionItem = adj.tuitionItem;
    await this.adjustmentRepo.remove(adj);
    return await this.recalculateTuitionItem(tuitionItem);
  }

  async bulkAdjustment(teacherId: string, dto: BulkTuitionAdjustmentDto) {
    const results = [];
    for (const tuitionId of dto.tuitionIds) {
      const tuition = await this.tuitionRepo.findOne({
        where: { id: tuitionId, teacherId },
      });
      if (!tuition) continue;

      const adj = this.adjustmentRepo.create({
        id: `adj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        tuitionItemId: tuition.id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        createdBy: teacherId,
      });
      await this.adjustmentRepo.save(adj);
      const updated = await this.recalculateTuitionItem(tuition);
      results.push(updated);
    }
    return results;
  }

  async bulkPayment(teacherId: string, dto: BulkPaymentDto) {
    const results = [];
    for (const tuitionId of dto.tuitionIds) {
      const tuition = await this.tuitionRepo.findOne({
        where: { id: tuitionId, teacherId },
      });
      if (!tuition || Number(tuition.remainingAmount) <= 0) continue;

      const payment = this.paymentRepo.create({
        id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        tuitionItemId: tuition.id,
        teacherId,
        studentId: tuition.studentId,
        amount: Number(tuition.remainingAmount),
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod || 'CASH',
        note: dto.note || 'Thanh toán hàng loạt',
      });
      await this.paymentRepo.save(payment);
      const updated = await this.recalculateTuitionItem(tuition);
      results.push(updated);
    }
    return results;
  }

  async updateStatus(
    teacherId: string,
    tuitionId: string,
    targetStatus: TuitionStatus,
  ) {
    const tuition = await this.getTuitionDetail(teacherId, tuitionId);

    if (targetStatus === 'PAID') {
      if (Number(tuition.remainingAmount) > 0) {
        const payment = this.paymentRepo.create({
          id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          tuitionItemId: tuition.id,
          teacherId,
          studentId: tuition.studentId,
          amount: Number(tuition.remainingAmount),
          paymentDate: new Date().toISOString().substring(0, 10),
          paymentMethod: 'CASH',
          note: 'Xác nhận thanh toán đủ',
        });
        await this.paymentRepo.save(payment);
      }
    } else if (targetStatus === 'UNPAID') {
      const payments = await this.paymentRepo.find({
        where: { tuitionItemId: tuition.id },
      });
      if (payments.length > 0) {
        await this.paymentRepo.remove(payments);
      }
    }

    return await this.recalculateTuitionItem(tuition);
  }

  async exportTuitionToExcel(
    teacherId: string,
    query: { month?: string; classId?: string; status?: TuitionStatus },
  ): Promise<Buffer> {
    const list = await this.getTuitionList(teacherId, query);

    const rows = list.map((item, index) => ({
      STT: index + 1,
      'Học sinh': item.studentName,
      Email: item.studentEmail,
      'Lớp học': item.className,
      Tháng: item.month,
      'Số buổi': item.lessonCount,
      'Số giờ dạy': item.totalHours,
      'Học phí gốc': item.baseAmount,
      'Phụ thu': item.surcharge,
      'Giảm trừ': item.discount,
      'Tổng học phí': item.totalAmount,
      'Đã thanh toán': item.paidAmount,
      'Còn lại': item.remainingAmount,
      'Trạng thái':
        item.status === 'PAID'
          ? 'Đã hoàn thành'
          : item.status === 'PARTIALLY_PAID'
            ? 'Thanh toán một phần'
            : 'Chưa thanh toán',
    }));

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'HocPhi');

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
