import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
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
} from '../dto/tuition.dto.js';
import { generateTuitionExcelReport } from '../utils/tuition-excel.util.js';
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
   * Đồng bộ & tính toán học phí chuẩn từ lịch dạy (Schedule is Source of Truth).
   * Chỉ tính các buổi học hợp lệ (status !== 'CANCELLED' và attendance !== 'ABSENT').
   */
  async syncTuitionData(teacherId: string, month: string): Promise<void> {
    // 1. Lấy tất cả các buổi học hợp lệ trong tháng của giáo viên
    const lessons = await this.lessonRepo.find({
      where: { teacherId },
    });
    const monthLessons = lessons.filter(
      (l) => l.date.startsWith(month) && l.status !== 'CANCELLED',
    );
    const lessonMap = new Map(monthLessons.map((l) => [l.id, l]));
    const lessonIds = monthLessons.map((l) => l.id);

    let participants: LessonParticipantEntity[] = [];
    if (lessonIds.length > 0) {
      participants = await this.participantRepo.find({
        where: { lessonId: In(lessonIds) },
      });
    }

    // 2. Gom nhóm học phí theo (classId, studentId)
    const groupedFees = new Map<
      string,
      { baseAmount: number; lessonCount: number; totalHours: number }
    >();

    for (const p of participants) {
      const lesson = lessonMap.get(p.lessonId);
      if (!lesson) continue;

      // Không tính tiền cho học sinh vắng mặt
      if (p.attendanceStatus === 'ABSENT') continue;

      const key = `${lesson.classId}__${p.studentId}`;
      const current = groupedFees.get(key) || { baseAmount: 0, lessonCount: 0, totalHours: 0 };
      const fee = Number(
        p.feeAmount !== null && p.feeAmount !== undefined
          ? p.feeAmount
          : lesson.feePerLesson || 0,
      );

      current.baseAmount += fee;
      current.lessonCount += 1;
      current.totalHours += Number(lesson.duration || 1);
      groupedFees.set(key, current);
    }

    // 3. Fallback cho lớp kèm 1-1 nếu chưa có record participants
    for (const lesson of monthLessons) {
      if (lesson.classId.startsWith('private-')) {
        const studentId = lesson.classId.replace('private-', '');
        const key = `${lesson.classId}__${studentId}`;
        const hasParticipant = participants.some(
          (p) => p.lessonId === lesson.id && p.studentId === studentId,
        );
        if (!hasParticipant) {
          const current = groupedFees.get(key) || { baseAmount: 0, lessonCount: 0, totalHours: 0 };
          current.baseAmount += Number(lesson.feePerLesson || 0);
          current.lessonCount += 1;
          current.totalHours += Number(lesson.duration || 1);
          groupedFees.set(key, current);
        }
      }
    }

    // 4. Lấy toàn bộ TuitionItemEntity hiện có của giáo viên trong tháng
    const existingItems = await this.tuitionRepo.find({
      where: { teacherId, month },
    });
    const existingMap = new Map(
      existingItems.map((item) => [`${item.classId}__${item.studentId}`, item]),
    );

    // 5. Cập nhật hoặc tạo mới các mục học phí từ groupedFees (idempotent, không nhân đôi)
    for (const [key, feeInfo] of groupedFees.entries()) {
      const [classId, studentId] = key.split('__');
      const existing = existingMap.get(key);

      if (!existing) {
        const tuitionItem = this.tuitionRepo.create({
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
        if (Number(existing.baseAmount) !== Number(feeInfo.baseAmount)) {
          existing.baseAmount = feeInfo.baseAmount;
          await this.recalculateTuitionItem(existing);
        }
      }
    }

    // 6. Xử lý các mục học phí cũ mà hiện tại không còn buổi học nào hợp lệ (buổi học bị xóa hoặc hủy)
    for (const existing of existingItems) {
      const key = `${existing.classId}__${existing.studentId}`;
      if (!groupedFees.has(key)) {
        const payments = await this.paymentRepo.find({
          where: { tuitionItemId: existing.id },
        });
        const hasCompletedPayment = payments.some(
          (p) => p.status === 'COMPLETED' || !p.status,
        );
        const adjustments = await this.adjustmentRepo.find({
          where: { tuitionItemId: existing.id },
        });

        if (!hasCompletedPayment && adjustments.length === 0) {
          // Xóa orphan tuition nếu không phát sinh thanh toán hay điều chỉnh tài chính
          if (payments.length > 0) {
            await this.paymentRepo.remove(payments);
          }
          await this.tuitionRepo.remove(existing);
        } else {
          // Bảo toàn lịch sử thanh toán, cập nhật baseAmount về 0 và tính toán lại
          if (Number(existing.baseAmount) !== 0) {
            existing.baseAmount = 0;
            await this.recalculateTuitionItem(existing);
          }
        }
      }
    }
  }

  /**
   * Tính toán lại tổng tiền, số tiền còn lại và trạng thái của bản ghi học phí.
   */
  async recalculateTuitionItem(
    item: TuitionItemEntity,
    manager?: EntityManager,
  ): Promise<TuitionItemEntity> {
    const adjRepo = manager
      ? manager.getRepository(TuitionAdjustmentEntity)
      : this.adjustmentRepo;
    const payRepo = manager
      ? manager.getRepository(TuitionPaymentEntity)
      : this.paymentRepo;
    const tuiRepo = manager
      ? manager.getRepository(TuitionItemEntity)
      : this.tuitionRepo;

    const adjustments = await adjRepo.find({
      where: { tuitionItemId: item.id },
    });
    const payments = await payRepo.find({
      where: { tuitionItemId: item.id },
    });

    let surcharge = 0;
    let discount = 0;
    for (const adj of adjustments) {
      if (adj.type === 'SURCHARGE') surcharge += Math.round(Number(adj.amount || 0));
      if (adj.type === 'DISCOUNT') discount += Math.round(Number(adj.amount || 0));
    }

    let paid = 0;
    for (const p of payments) {
      if (p.status === 'COMPLETED' || !p.status) {
        paid += Math.round(Number(p.amount || 0));
      }
    }

    const base = Math.round(Number(item.baseAmount || 0));
    const total = Math.max(0, Math.round(base + surcharge - discount));
    const remaining = Math.max(0, Math.round(total - paid));

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

    return await tuiRepo.save(item);
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

    // Lấy thông tin số buổi và số giờ cho từng học sinh trong tháng từ các buổi hợp lệ
    const lessons = await this.lessonRepo.find({
      where: { teacherId },
    });
    const monthLessons = lessons.filter(
      (l) => l.date.startsWith(currentMonth) && l.status !== 'CANCELLED',
    );
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
          p.lesson.status !== 'CANCELLED' &&
          p.attendanceStatus !== 'ABSENT',
      );

      let lessonCount = studentParts.length;
      let totalHours = Number(
        studentParts
          .reduce((acc, cur) => acc + Number(cur.lesson?.duration || 1), 0)
          .toFixed(2),
      );

      // Fallback cho lớp 1-1 nếu không có record trong participants
      if (lessonCount === 0 && item.classId.startsWith('private-')) {
        const privateLessons = monthLessons.filter((l) => l.classId === item.classId);
        lessonCount = privateLessons.length;
        totalHours = Number(
          privateLessons
            .reduce((acc, cur) => acc + Number(cur.duration || 1), 0)
            .toFixed(2),
        );
      }

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
    const [currY, currM] = (endMonth || new Date().toISOString().substring(0, 7))
      .split('-')
      .map(Number);
    const months: { month: string; label: string; total: number; paid: number; unpaid: number }[] =
      [];

    // Đồng bộ tháng hiện tại đang xem
    await this.syncTuitionData(teacherId, endMonth);

    // Lấy toàn bộ bản ghi học phí của giáo viên trong 1 truy vấn duy nhất
    const items = await this.tuitionRepo.find({
      where: { teacherId },
    });

    const itemsByMonth = new Map<string, TuitionItemEntity[]>();
    for (const item of items) {
      if (!itemsByMonth.has(item.month)) {
        itemsByMonth.set(item.month, []);
      }
      itemsByMonth.get(item.month)!.push(item);
    }

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currY, currM - 1 - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `T${d.getMonth() + 1}`;

      const monthItems = itemsByMonth.get(mStr) || [];
      const total = monthItems.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
      const paid = monthItems.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
      const unpaid = monthItems.reduce((sum, item) => sum + Number(item.remainingAmount || 0), 0);

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
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền điều chỉnh phải lớn hơn 0');
    }

    const tuition = await this.getTuitionDetail(teacherId, tuitionId);

    // Kiểm tra ràng buộc tài chính nếu là GIẢM TRỪ (DISCOUNT)
    if (dto.type === 'DISCOUNT') {
      const simulatedTotal = Math.max(
        0,
        Math.round(
          Number(tuition.baseAmount) +
            Number(tuition.surcharge) -
            (Number(tuition.discount) + Number(dto.amount)),
        ),
      );
      if (simulatedTotal < Number(tuition.paidAmount)) {
        throw new BadRequestException(
          `Không thể áp dụng giảm trừ: Số tiền giảm trừ (${dto.amount.toLocaleString('vi-VN')} đ) khiến tổng học phí (${simulatedTotal.toLocaleString('vi-VN')} đ) thấp hơn số tiền học sinh đã thanh toán (${Number(tuition.paidAmount).toLocaleString('vi-VN')} đ). Vui lòng hoàn tiền trước.`,
        );
      }
    }

    const adj = this.adjustmentRepo.create({
      id: `adj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      tuitionItemId: tuition.id,
      type: dto.type,
      amount: Math.round(Number(dto.amount)),
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
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const tuition = await manager.findOne(TuitionItemEntity, {
        where: { id: tuitionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!tuition) {
        throw new NotFoundException('Không tìm thấy bản ghi học phí');
      }

      if (tuition.teacherId !== teacherId) {
        throw new ForbiddenException('Bạn không có quyền truy cập bản ghi học phí này');
      }

      const remaining = Number(tuition.remainingAmount);
      if (dto.amount > remaining) {
        throw new BadRequestException(
          `Số tiền thanh toán (${dto.amount.toLocaleString('vi-VN')} đ) không được vượt quá số tiền còn lại (${remaining.toLocaleString('vi-VN')} đ)`,
        );
      }

      const payment = manager.create(TuitionPaymentEntity, {
        id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        tuitionItemId: tuition.id,
        teacherId,
        studentId: tuition.studentId,
        amount: Math.round(Number(dto.amount)),
        paymentDate: dto.paymentDate,
        paymentMethod: dto.paymentMethod || 'CASH',
        status: 'COMPLETED',
        note: dto.note || '',
      });

      await manager.save(payment);
      return await this.recalculateTuitionItem(tuition, manager);
    });
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

    // Kiểm tra ràng buộc tài chính nếu xóa khoản PHỤ THU (SURCHARGE)
    if (adj.type === 'SURCHARGE') {
      const simulatedTotal = Math.max(
        0,
        Math.round(
          Number(tuitionItem.baseAmount) +
            (Number(tuitionItem.surcharge) - Number(adj.amount)) -
            Number(tuitionItem.discount),
        ),
      );
      if (simulatedTotal < Number(tuitionItem.paidAmount)) {
        throw new BadRequestException(
          `Không thể xóa phụ thu: Thao tác này khiến tổng học phí (${simulatedTotal.toLocaleString('vi-VN')} đ) thấp hơn số tiền học sinh đã thanh toán (${Number(tuitionItem.paidAmount).toLocaleString('vi-VN')} đ). Vui lòng hoàn tiền trước.`,
        );
      }
    }

    await this.adjustmentRepo.remove(adj);
    return await this.recalculateTuitionItem(tuitionItem);
  }

  async bulkAdjustment(teacherId: string, dto: BulkTuitionAdjustmentDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Số tiền điều chỉnh phải lớn hơn 0');
    }
    const results: TuitionItemEntity[] = [];
    for (const tuitionId of dto.tuitionIds) {
      const tuition = await this.tuitionRepo.findOne({
        where: { id: tuitionId, teacherId },
      });
      if (!tuition) continue;

      if (dto.type === 'DISCOUNT') {
        const simulatedTotal = Math.max(
          0,
          Math.round(
            Number(tuition.baseAmount) +
              Number(tuition.surcharge) -
              (Number(tuition.discount) + Number(dto.amount)),
          ),
        );
        if (simulatedTotal < Number(tuition.paidAmount)) {
          continue;
        }
      }

      const adj = this.adjustmentRepo.create({
        id: `adj-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        tuitionItemId: tuition.id,
        type: dto.type,
        amount: Math.round(Number(dto.amount)),
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
    const results: TuitionItemEntity[] = [];
    for (const tuitionId of dto.tuitionIds) {
      await this.dataSource.transaction(async (manager) => {
        const tuition = await manager.findOne(TuitionItemEntity, {
          where: { id: tuitionId, teacherId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!tuition || Number(tuition.remainingAmount) <= 0) return;

        const payment = manager.create(TuitionPaymentEntity, {
          id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          tuitionItemId: tuition.id,
          teacherId,
          studentId: tuition.studentId,
          amount: Number(tuition.remainingAmount),
          paymentDate: dto.paymentDate,
          paymentMethod: dto.paymentMethod || 'CASH',
          note: dto.note || 'Thanh toán hàng loạt',
        });
        await manager.save(payment);
        const updated = await this.recalculateTuitionItem(tuition, manager);
        results.push(updated);
      });
    }
    return results;
  }

  async updateStatus(
    teacherId: string,
    tuitionId: string,
    targetStatus: TuitionStatus,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const tuition = await manager.findOne(TuitionItemEntity, {
        where: { id: tuitionId },
        relations: { student: true, class: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!tuition) {
        throw new NotFoundException('Không tìm thấy bản ghi học phí');
      }

      if (tuition.teacherId !== teacherId) {
        throw new ForbiddenException('Bạn không có quyền truy cập bản ghi học phí này');
      }

      if (targetStatus === 'PAID') {
        if (Number(tuition.remainingAmount) > 0) {
          const payment = manager.create(TuitionPaymentEntity, {
            id: `pay-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            tuitionItemId: tuition.id,
            teacherId,
            studentId: tuition.studentId,
            amount: Number(tuition.remainingAmount),
            paymentDate: new Date().toISOString().substring(0, 10),
            paymentMethod: 'CASH',
            note: 'Xác nhận thanh toán đủ',
          });
          await manager.save(payment);
        }
      } else if (targetStatus === 'UNPAID') {
        const payRepo = manager.getRepository(TuitionPaymentEntity);
        const payments = await payRepo.find({
          where: { tuitionItemId: tuition.id },
        });
        if (payments.length > 0) {
          for (const p of payments) {
            // Chỉ VOID các giao dịch COMPLETED, bảo toàn các giao dịch đã REFUNDED
            if (p.status === 'COMPLETED' || !p.status) {
              p.status = 'VOIDED';
              p.note = `${p.note || ''} | Hủy thanh toán khi chuyển sang Chưa thu`.trim();
              await payRepo.save(p);
            }
          }
        }
      }

      return await this.recalculateTuitionItem(tuition, manager);
    });
  }

  /**
   * Hoàn tiền hoặc hủy giao dịch thanh toán (Bảo lưu audit trail, không hard-delete)
   * Hỗ trợ cả Hoàn tiền toàn phần (Full Refund) và Hoàn tiền một phần (Partial Refund).
   */
  async refundPayment(
    teacherId: string,
    paymentId: string,
    reason?: string,
    refundAmount?: number,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const payRepo = manager.getRepository(TuitionPaymentEntity);
      const payment = await payRepo.findOne({
        where: { id: paymentId },
        relations: { tuitionItem: true },
      });

      if (!payment) {
        throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
      }

      if (payment.teacherId !== teacherId) {
        throw new ForbiddenException('Bạn không có quyền hoàn tiền cho giao dịch này');
      }

      // Ngăn chặn Double Refund
      if (payment.status === 'REFUNDED') {
        throw new BadRequestException('Giao dịch này đã được hoàn tiền trước đó');
      }

      // Ngăn chặn Refund After Void
      if (payment.status === 'VOIDED') {
        throw new BadRequestException('Giao dịch này đã bị hủy bỏ trước đó, không thể hoàn tiền');
      }

      const originalAmount = Math.round(Number(payment.amount));

      // Kiểm tra giá trị hoàn tiền nếu yêu cầu hoàn một phần
      if (refundAmount !== undefined) {
        if (refundAmount <= 0) {
          throw new BadRequestException('Số tiền hoàn phải lớn hơn 0');
        }
        if (refundAmount > originalAmount) {
          throw new BadRequestException(
            `Số tiền hoàn (${refundAmount.toLocaleString('vi-VN')} đ) không được vượt quá số tiền đã thanh toán (${originalAmount.toLocaleString('vi-VN')} đ)`,
          );
        }
      }

      const actualRefund = refundAmount !== undefined ? Math.round(refundAmount) : originalAmount;

      if (actualRefund === originalAmount) {
        // FULL REFUND
        payment.status = 'REFUNDED';
        payment.note = payment.note
          ? `${payment.note} | Hoàn toàn phần: ${reason || 'Không ghi chú'}`
          : `Hoàn toàn phần: ${reason || 'Không ghi chú'}`;
        await payRepo.save(payment);
      } else {
        // PARTIAL REFUND: Giảm số tiền của giao dịch gốc và ghi nhận giao dịch REFUNDED riêng
        payment.amount = originalAmount - actualRefund;
        payment.note = payment.note
          ? `${payment.note} | Đã hoàn một phần ${actualRefund.toLocaleString('vi-VN')} đ: ${reason || 'Không ghi chú'}`
          : `Đã hoàn một phần ${actualRefund.toLocaleString('vi-VN')} đ: ${reason || 'Không ghi chú'}`;
        await payRepo.save(payment);

        const refundTx = payRepo.create({
          id: `pay-rf-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
          tuitionItemId: payment.tuitionItemId,
          teacherId,
          studentId: payment.studentId,
          amount: actualRefund,
          paymentDate: new Date().toISOString().substring(0, 10),
          paymentMethod: payment.paymentMethod,
          status: 'REFUNDED',
          note: `Hoàn một phần ${actualRefund.toLocaleString('vi-VN')} đ từ giao dịch ${payment.id}: ${reason || 'Không ghi chú'}`,
        });
        await payRepo.save(refundTx);
      }

      const tuition = await manager.findOne(TuitionItemEntity, {
        where: { id: payment.tuitionItemId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!tuition) {
        throw new NotFoundException('Không tìm thấy bản ghi học phí liên quan');
      }

      return await this.recalculateTuitionItem(tuition, manager);
    });
  }

  async exportTuitionToExcel(
    teacherId: string,
    query: { month?: string; classId?: string; status?: TuitionStatus },
  ): Promise<Buffer> {
    const list = await this.getTuitionList(teacherId, query);
    const teacher = await this.userRepo.findOne({ where: { id: teacherId } });

    let className: string | undefined = undefined;
    if (query.classId) {
      const cls = await this.classRepo.findOne({ where: { id: query.classId } });
      if (cls) className = cls.name;
    }

    return await generateTuitionExcelReport(list, {
      teacherName: teacher?.name || 'Giáo viên',
      month: query.month,
      className,
    });
  }
}
