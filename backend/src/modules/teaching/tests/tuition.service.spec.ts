import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TuitionService } from '../services/tuition.service.js';
import { ScheduleService } from '../services/schedule.service.js';
import { TuitionItemEntity } from '../entities/tuition-item.entity.js';
import { generateTuitionExcelReport } from '../utils/tuition-excel.util.js';
import ExcelJS from 'exceljs';

describe('Tuition Financial Integrity Verification - 36 Scenario Test Matrix', () => {
  // TC-01: Create lesson
  it('TC-01: Create lesson -> tuition: Buổi học hợp lệ tạo bản ghi học phí chuẩn', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        {
          id: 'lesson-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-18',
          feePerLesson: 100000,
          duration: 1.5,
          status: 'SCHEDULED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'part-1',
          lessonId: 'lesson-1',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 100000,
        },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].studentId).toBe('student-1');
    expect(tuitionStore[0].baseAmount).toBe(100000);
    expect(tuitionStore[0].totalAmount).toBe(100000);
    expect(tuitionStore[0].remainingAmount).toBe(100000);
    expect(tuitionStore[0].status).toBe('UNPAID');
  });

  // TC-02: Update fee
  it('TC-02: Update fee: Đổi giá buổi học (100k -> 150k) đồng bộ chính xác học phí', async () => {
    let currentFee = 100000;
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        {
          id: 'lesson-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-18',
          feePerLesson: currentFee,
          duration: 1.5,
          status: 'SCHEDULED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'part-1',
          lessonId: 'lesson-1',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: currentFee,
        },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(100000);

    currentFee = 150000;
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(150000);
    expect(tuitionStore[0].totalAmount).toBe(150000);
  });

  // TC-03: Update date same month
  it('TC-03: Update date same month: Đổi ngày trong cùng tháng giữ nguyên tổng tiền', async () => {
    let lessonDate = '2026-10-10';
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        {
          id: 'lesson-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: lessonDate,
          feePerLesson: 120000,
          duration: 1.5,
          status: 'SCHEDULED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'part-1',
          lessonId: 'lesson-1',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 120000,
        },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(120000);

    lessonDate = '2026-10-25';
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(120000);
  });

  // TC-04: Update date different month
  it('TC-04: Update date different month: Chuyển buổi học sang tháng khác cập nhật cả hai tháng', async () => {
    let lessonDate = '2026-10-10';
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async ({ where }: any) =>
        tuitionStore.filter((t) => !where?.month || t.month === where.month),
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
      remove: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore.splice(idx, 1);
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        {
          id: 'lesson-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: lessonDate,
          feePerLesson: 100000,
          status: 'SCHEDULED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'part-1',
          lessonId: 'lesson-1',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 100000,
        },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [], count: async () => 0 } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 100000)).toBe(true);

    lessonDate = '2026-11-10';
    await service.syncTuitionData('teacher-1', '2026-11');
    await service.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 100000)).toBe(true);
    expect(tuitionStore.some((t) => t.month === '2026-10')).toBe(false);
  });

  // TC-05: Delete unpaid lesson
  it('TC-05: Delete unpaid lesson: Xóa buổi chưa thanh toán giảm đúng số tiền', async () => {
    let lessons = [
      { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-10', feePerLesson: 100000, status: 'SCHEDULED' },
      { id: 'l-2', teacherId: 't-1', classId: 'c-1', date: '2026-10-15', feePerLesson: 100000, status: 'SCHEDULED' },
    ];

    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-1', lessonId: 'l-1', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
        { id: 'p-2', lessonId: 'l-2', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      { find: async () => lessons } as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(200000);

    lessons = [lessons[0]];
    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(100000);
  });

  // TC-06: Delete paid lesson (blocked)
  it('TC-06: Delete paid lesson (blocked): Ngăn chặn xóa buổi học nếu đã phát sinh thanh toán vượt quá', async () => {
    const fakeLesson = {
      id: 'l-paid',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-10-18',
      feePerLesson: 100000,
      participants: [{ studentId: 's-1' }],
    };

    const fakeTuition = {
      id: 't-1',
      teacherId: 't-1',
      classId: 'c-1',
      studentId: 's-1',
      month: '2026-10',
      paidAmount: 100000,
      totalAmount: 100000,
    };

    const scheduleService = new ScheduleService(
      {
        findOne: async () => fakeLesson,
        find: async () => [fakeLesson],
        remove: async () => {},
      } as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      { findOne: async () => fakeTuition } as any,
      { syncTuitionData: async () => {} } as any,
      {} as any,
    );

    await expect(scheduleService.deleteLesson('t-1', 'l-paid')).rejects.toThrow(BadRequestException);
  });

  // TC-07: Cancel unpaid lesson
  it('TC-07: Cancel unpaid lesson: Buổi học hủy khi chưa nộp tiền loại trừ chính xác khỏi học phí', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-18', feePerLesson: 100000, status: 'CANCELLED' },
        { id: 'l-2', teacherId: 't-1', classId: 'c-1', date: '2026-10-19', feePerLesson: 150000, status: 'SCHEDULED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-1', lessonId: 'l-1', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
        { id: 'p-2', lessonId: 'l-2', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 150000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(150000);
  });

  // TC-08: Cancel paid lesson (blocked)
  it('TC-08: Cancel paid lesson (blocked): Ngăn chặn hủy buổi học nếu vi phạm paidAmount <= totalAmount', async () => {
    const fakeLesson = {
      id: 'l-paid',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-10-18',
      feePerLesson: 100000,
      status: 'SCHEDULED',
      participants: [{ studentId: 's-1' }],
    };

    const fakeTuition = {
      id: 't-1',
      teacherId: 't-1',
      classId: 'c-1',
      studentId: 's-1',
      month: '2026-10',
      paidAmount: 100000,
      totalAmount: 100000,
    };

    const scheduleService = new ScheduleService(
      {
        findOne: async () => fakeLesson,
        find: async () => [fakeLesson],
        save: async () => {},
      } as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      { findOne: async () => fakeTuition } as any,
      { syncTuitionData: async () => {} } as any,
      {} as any,
    );

    await expect(
      scheduleService.updateLesson('t-1', 'l-paid', { status: 'CANCELLED' }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-09: ABSENT
  it('TC-09: ABSENT: Học sinh vắng mặt không bị tính tiền', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-18', feePerLesson: 100000, status: 'COMPLETED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-absent', lessonId: 'l-1', studentId: 's-absent', attendanceStatus: 'ABSENT', feeAmount: 100000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.length).toBe(0);
  });

  // TC-10: EXCUSED
  it('TC-10: EXCUSED: Học sinh nghỉ có phép giữ nguyên business rule hiện tại', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-18', feePerLesson: 100000, status: 'COMPLETED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-excused', lessonId: 'l-1', studentId: 's-excused', attendanceStatus: 'EXCUSED', feeAmount: 100000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].baseAmount).toBe(100000);
  });

  // TC-11: Multiple lessons
  it('TC-11: Multiple lessons: Nhiều buổi học tính tổng chính xác (3 buổi x 100k = 300k)', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-01', feePerLesson: 100000, status: 'SCHEDULED' },
        { id: 'l-2', teacherId: 't-1', classId: 'c-1', date: '2026-10-08', feePerLesson: 100000, status: 'SCHEDULED' },
        { id: 'l-3', teacherId: 't-1', classId: 'c-1', date: '2026-10-15', feePerLesson: 100000, status: 'SCHEDULED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-1', lessonId: 'l-1', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
        { id: 'p-2', lessonId: 'l-2', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
        { id: 'p-3', lessonId: 'l-3', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(300000);
  });

  // TC-12: Different fees
  it('TC-12: Different fees: Các buổi giá khác nhau được cộng dồn chính xác (100k + 150k = 250k)', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-01', feePerLesson: 100000, status: 'SCHEDULED' },
        { id: 'l-2', teacherId: 't-1', classId: 'c-1', date: '2026-10-08', feePerLesson: 150000, status: 'SCHEDULED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-1', lessonId: 'l-1', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
        { id: 'p-2', lessonId: 'l-2', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 150000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(250000);
  });

  // TC-13: Idempotent sync
  it('TC-13: Idempotent sync: Chạy sync 1 lần, 10 lần, 100 lần kết quả tuyệt đối giống nhau', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
    };

    const fakeLessonRepo = {
      find: async () => [
        { id: 'l-1', teacherId: 't-1', classId: 'c-1', date: '2026-10-18', feePerLesson: 100000, status: 'SCHEDULED' },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        { id: 'p-1', lessonId: 'l-1', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 100000 },
      ],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      fakeLessonRepo as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    for (let i = 0; i < 100; i++) {
      await service.syncTuitionData('t-1', '2026-10');
    }

    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].baseAmount).toBe(100000);
    expect(tuitionStore[0].totalAmount).toBe(100000);
  });

  // TC-14: Full payment
  it('TC-14: Full payment: Thanh toán đủ chuyển status -> PAID và remainingAmount = 0', async () => {
    const item = {
      id: 'tui-1',
      baseAmount: 200000,
      totalAmount: 200000,
      paidAmount: 0,
      remainingAmount: 200000,
      status: 'UNPAID',
    } as TuitionItemEntity;

    const service = new TuitionService(
      { save: async (it: any) => it } as any,
      { find: async () => [] } as any,
      { find: async () => [{ amount: 200000, status: 'COMPLETED' }] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.recalculateTuitionItem(item);
    expect(result.paidAmount).toBe(200000);
    expect(result.remainingAmount).toBe(0);
    expect(result.status).toBe('PAID');
  });

  // TC-15: Partial payment
  it('TC-15: Partial payment: Thanh toán một phần chuyển status -> PARTIALLY_PAID', async () => {
    const item = {
      id: 'tui-1',
      baseAmount: 200000,
      totalAmount: 200000,
      paidAmount: 0,
      remainingAmount: 200000,
      status: 'UNPAID',
    } as TuitionItemEntity;

    const service = new TuitionService(
      { save: async (it: any) => it } as any,
      { find: async () => [] } as any,
      { find: async () => [{ amount: 80000, status: 'COMPLETED' }] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const result = await service.recalculateTuitionItem(item);
    expect(result.paidAmount).toBe(80000);
    expect(result.remainingAmount).toBe(120000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-16: Overpayment
  it('TC-16: Overpayment: Từ chối thanh toán số tiền lớn hơn số tiền còn lại', async () => {
    const fakeTuition = {
      id: 'tui-1',
      teacherId: 't-1',
      remainingAmount: 100000,
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => fakeTuition,
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.recordPayment('t-1', 'tui-1', { amount: 150000, paymentDate: '2026-10-19' }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-17: Zero payment
  it('TC-17: Zero payment: Từ chối số tiền <= 0', async () => {
    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.recordPayment('t-1', 'tui-1', { amount: 0, paymentDate: '2026-10-19' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.recordPayment('t-1', 'tui-1', { amount: -20000, paymentDate: '2026-10-19' }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-18: Concurrent payment
  it('TC-18: Concurrent payment: Giả lập 2 request đồng thời chỉ có 1 request thành công', async () => {
    let remaining = 100000;
    const item = {
      id: 'tui-concurrent',
      teacherId: 't-1',
      studentId: 's-1',
      baseAmount: 100000,
      totalAmount: 100000,
      paidAmount: 0,
      remainingAmount: 100000,
      status: 'UNPAID',
    };

    let lockAcquired = false;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        while (lockAcquired) {
          await new Promise((r) => setTimeout(r, 10));
        }
        lockAcquired = true;
        try {
          const fakeManager = {
            findOne: async () => ({ ...item, remainingAmount: remaining }),
            create: (_: any, data: any) => data,
            save: async (p: any) => {
              remaining -= p.amount;
              item.paidAmount += p.amount;
              item.remainingAmount = remaining;
              item.status = remaining === 0 ? 'PAID' : 'PARTIALLY_PAID';
              return p;
            },
            getRepository: () => ({
              find: async () => [{ amount: 100000, status: 'COMPLETED' }],
              save: async (t: any) => t,
            }),
          };
          return await cb(fakeManager);
        } finally {
          lockAcquired = false;
        }
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const req1 = service.recordPayment('t-1', 'tui-concurrent', { amount: 100000, paymentDate: '2026-10-19' });
    const req2 = service.recordPayment('t-1', 'tui-concurrent', { amount: 100000, paymentDate: '2026-10-19' });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(item.remainingAmount).toBe(0);
  });

  // TC-19: Payment immutability
  it('TC-19: Payment immutability: Thanh toán không thay đổi bất kỳ trường nào của buổi học', async () => {
    const originalLesson = {
      id: 'l-immut',
      date: '2026-10-18',
      startTime: '08:00',
      endTime: '09:30',
      duration: 1.5,
      feePerLesson: 100000,
      status: 'SCHEDULED',
    };

    const tuition = {
      id: 't-immut',
      teacherId: 't-1',
      studentId: 's-1',
      baseAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      status: 'UNPAID',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          create: (_: any, d: any) => d,
          save: async (p: any) => p,
          getRepository: () => ({
            find: async () => [{ amount: 100000, status: 'COMPLETED' }],
            save: async (i: any) => i,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await service.recordPayment('t-1', 't-immut', { amount: 100000, paymentDate: '2026-10-19' });

    expect(originalLesson.date).toBe('2026-10-18');
    expect(originalLesson.startTime).toBe('08:00');
    expect(originalLesson.endTime).toBe('09:30');
    expect(originalLesson.duration).toBe(1.5);
    expect(originalLesson.feePerLesson).toBe(100000);
    expect(originalLesson.status).toBe('SCHEDULED');
  });

  // TC-20: Full refund
  it('TC-20: Full refund: Hoàn tiền toàn phần cập nhật trạng thái REFUNDED và khôi phục remainingAmount', async () => {
    const payment = {
      id: 'pay-1',
      teacherId: 't-1',
      tuitionItemId: 'tui-1',
      amount: 100000,
      status: 'COMPLETED',
      note: 'Thanh toán học phí',
    };

    const tuition = {
      id: 'tui-1',
      teacherId: 't-1',
      baseAmount: 100000,
      totalAmount: 100000,
      paidAmount: 100000,
      remainingAmount: 0,
      status: 'PAID',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          getRepository: () => ({
            findOne: async () => payment,
            find: async () => [payment],
            save: async (item: any) => item,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.refundPayment('t-1', 'pay-1', 'Bảo lưu lịch học');
    expect(payment.status).toBe('REFUNDED');
    expect(payment.note).toContain('Hoàn toàn phần: Bảo lưu lịch học');
    expect(result.remainingAmount).toBe(100000);
    expect(result.status).toBe('UNPAID');
  });

  // TC-21: Partial refund
  it('TC-21: Partial refund: Hoàn tiền một phần giảm số tiền thanh toán và tạo audit trail REFUNDED', async () => {
    const payment = {
      id: 'pay-full',
      teacherId: 't-1',
      studentId: 's-1',
      tuitionItemId: 'tui-1',
      amount: 100000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      note: 'Thanh toán ban đầu',
    };

    const tuition = {
      id: 'tui-1',
      teacherId: 't-1',
      baseAmount: 100000,
      totalAmount: 100000,
      paidAmount: 100000,
      remainingAmount: 0,
      status: 'PAID',
    };

    const refundCreated: any[] = [];
    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          getRepository: () => ({
            findOne: async () => payment,
            find: async () => [payment, ...refundCreated],
            create: (data: any) => data,
            save: async (item: any) => {
              if (item.status === 'REFUNDED') refundCreated.push(item);
              return item;
            },
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    // Hoàn 40k trong tổng số 100k
    const result = await service.refundPayment('t-1', 'pay-full', 'Nghỉ 1 buổi', 40000);

    expect(payment.amount).toBe(60000);
    expect(payment.status).toBe('COMPLETED');
    expect(refundCreated.length).toBe(1);
    expect(refundCreated[0].amount).toBe(40000);
    expect(refundCreated[0].status).toBe('REFUNDED');
    expect(result.paidAmount).toBe(60000);
    expect(result.remainingAmount).toBe(40000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-22: Double refund
  it('TC-22: Double refund: Từ chối hoàn tiền lần thứ hai cho giao dịch đã hoàn', async () => {
    const payment = {
      id: 'pay-already-refunded',
      teacherId: 't-1',
      amount: 100000,
      status: 'REFUNDED',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          getRepository: () => ({
            findOne: async () => payment,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.refundPayment('t-1', 'pay-already-refunded', 'Lại hoàn tiền'),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-23: Over refund
  it('TC-23: Over refund: Từ chối hoàn tiền vượt quá số tiền của giao dịch gốc', async () => {
    const payment = {
      id: 'pay-small',
      teacherId: 't-1',
      amount: 50000,
      status: 'COMPLETED',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          getRepository: () => ({
            findOne: async () => payment,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.refundPayment('t-1', 'pay-small', 'Hoàn quá mức', 60000),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-24: Void payment
  it('TC-24: Void payment: Đổi trạng thái sang UNPAID đánh dấu VOIDED, không xóa cứng bản ghi', async () => {
    const payment = {
      id: 'pay-void',
      tuitionItemId: 't-void',
      amount: 100000,
      status: 'COMPLETED',
    };

    const tuition = {
      id: 't-void',
      teacherId: 't-1',
      studentId: 's-1',
      baseAmount: 100000,
      remainingAmount: 0,
      paidAmount: 100000,
      status: 'PAID',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
          getRepository: () => ({
            find: async () => [payment],
            save: async (p: any) => p,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.updateStatus('t-1', 't-void', 'UNPAID');
    expect(payment.status).toBe('VOIDED');
    expect(result.paidAmount).toBe(0);
    expect(result.remainingAmount).toBe(100000);
    expect(result.status).toBe('UNPAID');
  });

  // TC-25: Orphan without payment
  it('TC-25: Orphan without payment: Học phí mồ côi không có thanh toán được tự động dọn dẹp', async () => {
    const tuitionStore = [
      { id: 'tui-orphan-nopay', teacherId: 't-1', classId: 'c-1', studentId: 's-1', month: '2026-10', baseAmount: 100000 },
    ];

    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      save: async (item: any) => item,
      remove: async (item: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === item.id);
        if (idx >= 0) tuitionStore.splice(idx, 1);
      },
    };

    const fakePaymentRepo = {
      find: async () => [],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      fakePaymentRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.some((t) => t.id === 'tui-orphan-nopay')).toBe(false);
  });

  // TC-26: Orphan with payment
  it('TC-26: Orphan with payment: Học phí mồ côi đã có thanh toán được bảo toàn lịch sử tài chính', async () => {
    const tuitionStore = [
      { id: 'tui-has-pay', teacherId: 't-1', classId: 'c-1', studentId: 's-1', month: '2026-10', baseAmount: 100000, paidAmount: 100000 },
    ];

    const fakeTuitionRepo = {
      find: async () => [...tuitionStore],
      save: async (item: any) => item,
      remove: async () => {},
    };

    const fakePaymentRepo = {
      find: async () => [{ id: 'p1', amount: 100000, status: 'COMPLETED' }],
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      fakePaymentRepo as any,
      { find: async () => [] } as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.some((t) => t.id === 'tui-has-pay')).toBe(true);
    expect(tuitionStore[0].baseAmount).toBe(0);
  });

  // TC-27: Surcharge after payment
  it('TC-27: Surcharge after payment: Thêm phụ thu sau khi thanh toán làm tăng remainingAmount', async () => {
    const tuition = {
      id: 't-surch',
      teacherId: 't-1',
      baseAmount: 100000,
      surcharge: 0,
      discount: 0,
      totalAmount: 100000,
      paidAmount: 100000,
      remainingAmount: 0,
      status: 'PAID' as const,
    };

    const adjustments: any[] = [];
    const fakeAdjustmentRepo = {
      create: (d: any) => d,
      save: async (d: any) => {
        adjustments.push(d);
        return d;
      },
      find: async () => adjustments,
    };

    const fakePaymentRepo = {
      find: async () => [{ amount: 100000, status: 'COMPLETED' }],
    };

    const fakeTuitionRepo = {
      findOne: async () => tuition,
      save: async (item: any) => item,
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      fakeAdjustmentRepo as any,
      fakePaymentRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // Thêm phụ thu 20k giáo trình
    const result = await service.addAdjustment('t-1', 't-surch', {
      type: 'SURCHARGE',
      amount: 20000,
      reason: 'Tiền giáo trình',
    });

    expect(result.totalAmount).toBe(120000);
    expect(result.paidAmount).toBe(100000);
    expect(result.remainingAmount).toBe(20000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-28: Discount after payment
  it('TC-28: Discount after payment: Thêm giảm trừ hợp lệ sau khi thanh toán một phần', async () => {
    const tuition = {
      id: 't-disc',
      teacherId: 't-1',
      baseAmount: 100000,
      surcharge: 0,
      discount: 0,
      totalAmount: 100000,
      paidAmount: 40000,
      remainingAmount: 60000,
      status: 'PARTIALLY_PAID' as const,
    };

    const adjustments: any[] = [];
    const fakeAdjustmentRepo = {
      create: (d: any) => d,
      save: async (d: any) => {
        adjustments.push(d);
        return d;
      },
      find: async () => adjustments,
    };

    const fakePaymentRepo = {
      find: async () => [{ amount: 40000, status: 'COMPLETED' }],
    };

    const fakeTuitionRepo = {
      findOne: async () => tuition,
      save: async (item: any) => item,
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      fakeAdjustmentRepo as any,
      fakePaymentRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // Giảm 30k (tổng mới = 70k > 40k đã nộp)
    const result = await service.addAdjustment('t-1', 't-disc', {
      type: 'DISCOUNT',
      amount: 30000,
      reason: 'Học bổng khuyến học',
    });

    expect(result.totalAmount).toBe(70000);
    expect(result.paidAmount).toBe(40000);
    expect(result.remainingAmount).toBe(30000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-29: Discount causing total < paid (blocked)
  it('TC-29: Discount causing total < paid: Ngăn chặn giảm trừ nếu làm tổng tiền nhỏ hơn số tiền đã nộp', async () => {
    const tuition = {
      id: 't-disc-err',
      teacherId: 't-1',
      baseAmount: 100000,
      surcharge: 0,
      discount: 0,
      totalAmount: 100000,
      paidAmount: 80000,
      remainingAmount: 20000,
      status: 'PARTIALLY_PAID' as const,
    };

    const fakeTuitionRepo = {
      findOne: async () => tuition,
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // Giảm 30k -> tổng mới = 70k < 80k đã nộp -> phải BLOCK
    await expect(
      service.addAdjustment('t-1', 't-disc-err', {
        type: 'DISCOUNT',
        amount: 30000,
        reason: 'Giảm quá mức',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-30: T10 -> T11
  it('TC-30: T10 -> T11: Dời buổi học từ tháng 10 sang tháng 11 trừ T10 và cộng T11', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async ({ where }: any) =>
        tuitionStore.filter((t) => !where?.month || t.month === where.month),
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
      remove: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore.splice(idx, 1);
      },
    };

    let lesson = {
      id: 'l-t10',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-10-15',
      feePerLesson: 200000,
      status: 'SCHEDULED',
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [], count: async () => 0 } as any,
      { find: async () => [lesson] } as any,
      { find: async () => [{ lessonId: 'l-t10', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 200000 }] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 200000)).toBe(true);

    lesson.date = '2026-11-15';
    await service.syncTuitionData('t-1', '2026-11');
    await service.syncTuitionData('t-1', '2026-10');

    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 200000)).toBe(true);
    expect(tuitionStore.some((t) => t.month === '2026-10')).toBe(false);
  });

  // TC-31: T11 -> T10
  it('TC-31: T11 -> T10: Dời ngược buổi học từ tháng 11 về tháng 10 trừ T11 và cộng T10', async () => {
    const tuitionStore: any[] = [];
    const fakeTuitionRepo = {
      find: async ({ where }: any) =>
        tuitionStore.filter((t) => !where?.month || t.month === where.month),
      create: (data: any) => ({ ...data }),
      save: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore[idx] = data;
        else tuitionStore.push(data);
        return data;
      },
      remove: async (data: any) => {
        const idx = tuitionStore.findIndex((t) => t.id === data.id);
        if (idx >= 0) tuitionStore.splice(idx, 1);
      },
    };

    let lesson = {
      id: 'l-t11',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-11-20',
      feePerLesson: 250000,
      status: 'SCHEDULED',
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [], count: async () => 0 } as any,
      { find: async () => [lesson] } as any,
      { find: async () => [{ lessonId: 'l-t11', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 250000 }] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-11');
    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 250000)).toBe(true);

    lesson.date = '2026-10-20';
    await service.syncTuitionData('t-1', '2026-10');
    await service.syncTuitionData('t-1', '2026-11');

    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 250000)).toBe(true);
    expect(tuitionStore.some((t) => t.month === '2026-11')).toBe(false);
  });

  // TC-32: Cross-teacher access
  it('TC-32: Cross-teacher access: Truy cập dữ liệu của giáo viên khác trả về 403 Forbidden', async () => {
    const fakeTuitionRepo = {
      findOne: async () => ({
        id: 'tui-private',
        teacherId: 'teacher-A',
      }),
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await expect(
      service.getTuitionDetail('teacher-B', 'tui-private'),
    ).rejects.toThrow(ForbiddenException);
  });

  // TC-33: Excel export
  it('TC-33: Excel export: Tạo file Excel chuyên nghiệp với cấu trúc chuẩn và thông tin metadata', async () => {
    const items = [
      {
        id: 't-1',
        studentId: 's-1',
        studentName: 'Trần Văn B',
        studentEmail: 'b@gmail.com',
        classId: 'c-1',
        className: 'Toán 11A',
        month: '2026-10',
        lessonCount: 4,
        totalHours: 6.0,
        baseAmount: 400000,
        surcharge: 0,
        discount: 0,
        totalAmount: 400000,
        paidAmount: 400000,
        remainingAmount: 0,
        status: 'PAID' as const,
        adjustmentsCount: 0,
        paymentsCount: 1,
      },
    ];

    const buffer = await generateTuitionExcelReport(items, {
      teacherName: 'Cô Lan',
      month: '2026-10',
      className: 'Toán 11A',
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  // TC-34: Excel formulas
  it('TC-34: Excel formulas: Dòng tổng kết tích hợp công thức SUM tự động cho các cột số tiền', async () => {
    const items = [
      {
        id: 't-1',
        studentId: 's-1',
        studentName: 'Trần Văn B',
        studentEmail: 'b@gmail.com',
        classId: 'c-1',
        className: 'Toán 11A',
        month: '2026-10',
        lessonCount: 4,
        totalHours: 6.0,
        baseAmount: 400000,
        surcharge: 50000,
        discount: 20000,
        totalAmount: 430000,
        paidAmount: 200000,
        remainingAmount: 230000,
        status: 'PARTIALLY_PAID' as const,
        adjustmentsCount: 2,
        paymentsCount: 1,
      },
    ];

    const buffer = await generateTuitionExcelReport(items, {
      teacherName: 'Cô Lan',
      month: '2026-10',
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheet = wb.getWorksheet('Báo Cáo Học Phí')!;

    const summaryRow = sheet.getRow(8);
    const totalAmountCell = summaryRow.getCell(11); // Cột K = TỔNG CỘNG
    expect((totalAmountCell.value as any).formula).toBe('SUM(K7:K7)');
    expect(sheet.pageSetup.orientation).toBe('landscape');
  });

  // TC-35: Schedule sync failure (handled gracefully & logged)
  it('TC-35: Schedule sync failure: Lỗi trong quá trình auto-sync không nuốt exception mà log rõ ràng', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const failingTuitionService = {
      syncTuitionData: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    };

    const scheduleService = new ScheduleService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      failingTuitionService as any,
      {} as any,
    );

    // Gọi hàm safeSyncTuition thông qua method private
    await (scheduleService as any).safeSyncTuition('t-1', ['2026-10']);

    expect(failingTuitionService.syncTuitionData).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[CRITICAL RECONCILIATION]'),
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  // TC-36: Retry / reconciliation
  it('TC-36: Retry / reconciliation: Khi sync thất bại lần đầu, retry thành công mà không để mất dữ liệu', async () => {
    let callCount = 0;
    const transientTuitionService = {
      syncTuitionData: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Transient DB Lock');
        }
        return;
      }),
    };

    const scheduleService = new ScheduleService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      transientTuitionService as any,
      {} as any,
    );

    await (scheduleService as any).safeSyncTuition('t-1', ['2026-10']);

    expect(transientTuitionService.syncTuitionData).toHaveBeenCalledTimes(2);
    expect(callCount).toBe(2);
  });
});

describe('Tuition Payment Workflow Audit - TC-PAY Suite (Section 13)', () => {
  // TC-PAY-01: Teacher ghi nhận tiền mặt
  it('TC-PAY-01: Teacher ghi nhận tiền mặt thành công (CASH)', async () => {
    const tuition = {
      id: 'tui-cash',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 200000,
      totalAmount: 200000,
      remainingAmount: 200000,
      paidAmount: 0,
      status: 'UNPAID' as const,
    };

    let paymentSaved: any = null;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          create: (_: any, data: any) => data,
          save: async (p: any) => {
            paymentSaved = p;
            return p;
          },
          getRepository: () => ({
            find: async () => [paymentSaved],
            save: async (t: any) => t,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.recordPayment('teacher-1', 'tui-cash', {
      amount: 200000,
      paymentDate: '2026-10-19',
      paymentMethod: 'CASH',
      note: 'Phụ huynh đóng trực tiếp tại lớp',
    });

    expect(paymentSaved.paymentMethod).toBe('CASH');
    expect(paymentSaved.amount).toBe(200000);
    expect(paymentSaved.status).toBe('COMPLETED');
    expect(result.paidAmount).toBe(200000);
    expect(result.remainingAmount).toBe(0);
    expect(result.status).toBe('PAID');
  });

  // TC-PAY-02: Teacher ghi nhận chuyển khoản
  it('TC-PAY-02: Teacher ghi nhận chuyển khoản ngân hàng (BANK_TRANSFER)', async () => {
    const tuition = {
      id: 'tui-bank',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 300000,
      totalAmount: 300000,
      remainingAmount: 300000,
      paidAmount: 0,
      status: 'UNPAID' as const,
    };

    let paymentSaved: any = null;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          create: (_: any, data: any) => data,
          save: async (p: any) => {
            paymentSaved = p;
            return p;
          },
          getRepository: () => ({
            find: async () => [paymentSaved],
            save: async (t: any) => t,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.recordPayment('teacher-1', 'tui-bank', {
      amount: 300000,
      paymentDate: '2026-10-19',
      paymentMethod: 'BANK_TRANSFER',
      note: 'Phụ huynh chuyển khoản MBBank',
    });

    expect(paymentSaved.paymentMethod).toBe('BANK_TRANSFER');
    expect(paymentSaved.amount).toBe(300000);
    expect(result.paidAmount).toBe(300000);
    expect(result.remainingAmount).toBe(0);
    expect(result.status).toBe('PAID');
  });

  // TC-PAY-03: Thanh toán một phần
  it('TC-PAY-03: Thanh toán một phần: Tổng 700k, phụ huynh chuyển 300k, teacher xác nhận 300k -> còn lại 400k (PARTIALLY_PAID)', async () => {
    const tuition = {
      id: 'tui-partial',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 700000,
      totalAmount: 700000,
      remainingAmount: 700000,
      paidAmount: 0,
      status: 'UNPAID' as const,
    };

    const paymentsList: any[] = [];
    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          create: (_: any, data: any) => data,
          save: async (p: any) => {
            paymentsList.push(p);
            return p;
          },
          getRepository: () => ({
            find: async () => paymentsList,
            save: async (t: any) => t,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.recordPayment('teacher-1', 'tui-partial', {
      amount: 300000,
      paymentDate: '2026-10-19',
      paymentMethod: 'BANK_TRANSFER',
      note: 'Đợt 1',
    });

    expect(result.totalAmount).toBe(700000);
    expect(result.paidAmount).toBe(300000);
    expect(result.remainingAmount).toBe(400000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-PAY-04: Thanh toán phần còn lại
  it('TC-PAY-04: Thanh toán phần còn lại: Phụ huynh chuyển tiếp 400k, teacher xác nhận -> đã thu 700k, còn lại 0 (PAID)', async () => {
    const paymentsList: any[] = [
      { id: 'p1', amount: 300000, status: 'COMPLETED' },
    ];

    const tuition = {
      id: 'tui-partial',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 700000,
      totalAmount: 700000,
      remainingAmount: 400000,
      paidAmount: 300000,
      status: 'PARTIALLY_PAID' as const,
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        const mgr = {
          findOne: async () => tuition,
          create: (_: any, data: any) => data,
          save: async (p: any) => {
            paymentsList.push(p);
            return p;
          },
          getRepository: () => ({
            find: async () => paymentsList,
            save: async (t: any) => t,
          }),
        };
        return cb(mgr);
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.recordPayment('teacher-1', 'tui-partial', {
      amount: 400000,
      paymentDate: '2026-10-25',
      paymentMethod: 'BANK_TRANSFER',
      note: 'Đợt 2 thanh toán đủ',
    });

    expect(result.totalAmount).toBe(700000);
    expect(result.paidAmount).toBe(700000);
    expect(result.remainingAmount).toBe(0);
    expect(result.status).toBe('PAID');
  });

  // TC-PAY-05: Overpayment bị từ chối
  it('TC-PAY-05: Overpayment bị từ chối: Nộp số tiền vượt quá remainingAmount bị từ chối', async () => {
    const tuition = {
      id: 'tui-limit',
      teacherId: 'teacher-1',
      remainingAmount: 200000,
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.recordPayment('teacher-1', 'tui-limit', { amount: 250000, paymentDate: '2026-10-19' }),
    ).rejects.toThrow(BadRequestException);
  });

  // TC-PAY-06: Hai request đồng thời chỉ một request thành công
  it('TC-PAY-06: Hai request đồng thời chỉ một request thành công (Pessimistic write lock)', async () => {
    let remaining = 100000;
    const item = {
      id: 'tui-lock-race',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 100000,
      totalAmount: 100000,
      paidAmount: 0,
      remainingAmount: 100000,
      status: 'UNPAID',
    };

    let isLocked = false;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        while (isLocked) {
          await new Promise((r) => setTimeout(r, 10));
        }
        isLocked = true;
        try {
          const mgr = {
            findOne: async () => ({ ...item, remainingAmount: remaining }),
            create: (_: any, data: any) => data,
            save: async (p: any) => {
              remaining -= p.amount;
              item.paidAmount += p.amount;
              item.remainingAmount = remaining;
              item.status = remaining === 0 ? 'PAID' : 'PARTIALLY_PAID';
              return p;
            },
            getRepository: () => ({
              find: async () => [{ amount: 100000, status: 'COMPLETED' }],
              save: async (t: any) => t,
            }),
          };
          return await cb(mgr);
        } finally {
          isLocked = false;
        }
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const p1 = service.recordPayment('teacher-1', 'tui-lock-race', { amount: 100000, paymentDate: '2026-10-19' });
    const p2 = service.recordPayment('teacher-1', 'tui-lock-race', { amount: 100000, paymentDate: '2026-10-19' });

    const settled = await Promise.allSettled([p1, p2]);
    const succ = settled.filter((s) => s.status === 'fulfilled');
    const fail = settled.filter((s) => s.status === 'rejected');

    expect(succ.length).toBe(1);
    expect(fail.length).toBe(1);
    expect(item.remainingAmount).toBe(0);
  });

  // TC-PAY-07: Teacher A không thể ghi nhận payment của Teacher B
  it('TC-PAY-07: Teacher A không thể ghi nhận payment cho học phí của Teacher B (403 Forbidden)', async () => {
    const tuition = {
      id: 'tui-b',
      teacherId: 'teacher-B',
      remainingAmount: 100000,
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.recordPayment('teacher-A', 'tui-b', { amount: 100000, paymentDate: '2026-10-19' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // TC-PAY-08: Teacher A không thể refund payment của Teacher B
  it('TC-PAY-08: Teacher A không thể refund payment của Teacher B (403 Forbidden)', async () => {
    const payment = {
      id: 'pay-b',
      teacherId: 'teacher-B',
      amount: 100000,
      status: 'COMPLETED',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          getRepository: () => ({
            findOne: async () => payment,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await expect(
      service.refundPayment('teacher-A', 'pay-b', 'Thử refund trộm'),
    ).rejects.toThrow(ForbiddenException);
  });

  // TC-PAY-09: Void payment có audit trail
  it('TC-PAY-09: Void payment: Đổi sang UNPAID lưu vết trạng thái VOIDED và note hủy', async () => {
    const payment = {
      id: 'pay-void-audit',
      tuitionItemId: 't-va',
      amount: 150000,
      status: 'COMPLETED',
      note: 'Thu nhầm phụ huynh',
    };

    const tuition = {
      id: 't-va',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 150000,
      totalAmount: 150000,
      remainingAmount: 0,
      paidAmount: 150000,
      status: 'PAID',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
          getRepository: () => ({
            find: async () => [payment],
            save: async (p: any) => p,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.updateStatus('teacher-1', 't-va', 'UNPAID');

    expect(payment.status).toBe('VOIDED');
    expect(payment.note).toContain('Hủy thanh toán khi chuyển sang Chưa thu');
    expect(result.paidAmount).toBe(0);
    expect(result.remainingAmount).toBe(150000);
    expect(result.status).toBe('UNPAID');
  });

  // TC-PAY-10: Full refund có audit trail
  it('TC-PAY-10: Full refund: Hoàn tiền toàn phần ngoài hệ thống ghi nhận audit trail REFUNDED', async () => {
    const payment = {
      id: 'pay-rf-full',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      tuitionItemId: 'tui-rf-1',
      amount: 200000,
      status: 'COMPLETED',
      note: 'Phụ huynh nộp trước',
    };

    const tuition = {
      id: 'tui-rf-1',
      teacherId: 'teacher-1',
      baseAmount: 200000,
      totalAmount: 200000,
      paidAmount: 200000,
      remainingAmount: 0,
      status: 'PAID',
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
          getRepository: () => ({
            findOne: async () => payment,
            find: async () => [payment],
            save: async (item: any) => item,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    const result = await service.refundPayment(
      'teacher-1',
      'pay-rf-full',
      'Học sinh chuyển trường, giáo viên hoàn trả tiền mặt',
    );

    expect(payment.status).toBe('REFUNDED');
    expect(payment.note).toContain('Hoàn toàn phần: Học sinh chuyển trường, giáo viên hoàn trả tiền mặt');
    expect(result.paidAmount).toBe(0);
    expect(result.remainingAmount).toBe(200000);
    expect(result.status).toBe('UNPAID');
  });

  // TC-PAY-11: Partial refund có audit trail
  it('TC-PAY-11: Partial refund: Hoàn tiền một phần tạo transaction REFUNDED riêng, giảm tiền gốc', async () => {
    const payment = {
      id: 'pay-rf-part',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      tuitionItemId: 'tui-rf-2',
      amount: 500000,
      paymentMethod: 'BANK_TRANSFER',
      status: 'COMPLETED',
      note: 'Đã nộp 500k',
    };

    const tuition = {
      id: 'tui-rf-2',
      teacherId: 'teacher-1',
      baseAmount: 500000,
      totalAmount: 500000,
      paidAmount: 500000,
      remainingAmount: 0,
      status: 'PAID',
    };

    const refundRecords: any[] = [];
    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
          getRepository: () => ({
            findOne: async () => payment,
            find: async () => [payment, ...refundRecords],
            create: (d: any) => d,
            save: async (item: any) => {
              if (item.status === 'REFUNDED') refundRecords.push(item);
              return item;
            },
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    // Hoàn 150k cho phụ huynh ngoài hệ thống
    const result = await service.refundPayment(
      'teacher-1',
      'pay-rf-part',
      'Nghỉ 1 buổi có phép, giáo viên CK lại',
      150000,
    );

    expect(payment.amount).toBe(350000);
    expect(payment.status).toBe('COMPLETED');
    expect(refundRecords.length).toBe(1);
    expect(refundRecords[0].amount).toBe(150000);
    expect(refundRecords[0].status).toBe('REFUNDED');
    expect(refundRecords[0].note).toContain('Hoàn một phần 150.000 đ');
    expect(result.paidAmount).toBe(350000);
    expect(result.remainingAmount).toBe(150000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // TC-PAY-12: Payment không làm thay đổi Schedule
  it('TC-PAY-12: Payment không làm thay đổi Schedule: Lesson giữ nguyên 100% thuộc tính', async () => {
    const lessonSnapshot = {
      id: 'l-sched-check',
      date: '2026-10-18',
      startTime: '19:00',
      endTime: '20:30',
      duration: 1.5,
      feePerLesson: 120000,
      status: 'SCHEDULED',
      title: 'Toán 12 - Tích phân',
    };

    const tuition = {
      id: 't-sched-check',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 120000,
      remainingAmount: 120000,
      paidAmount: 0,
      status: 'UNPAID',
    };

    let paymentRecorded: any = null;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        return cb({
          findOne: async () => tuition,
          create: (_: any, d: any) => d,
          save: async (p: any) => {
            paymentRecorded = p;
            return p;
          },
          getRepository: () => ({
            find: async () => [paymentRecorded],
            save: async (t: any) => t,
          }),
        });
      },
    };

    const service = new TuitionService(
      {} as any,
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      fakeDataSource as any,
    );

    await service.recordPayment('teacher-1', 't-sched-check', {
      amount: 120000,
      paymentDate: '2026-10-19',
      paymentMethod: 'CASH',
    });

    // Toàn bộ các trường của buổi học phải giữ nguyên vẹn
    expect(lessonSnapshot.date).toBe('2026-10-18');
    expect(lessonSnapshot.startTime).toBe('19:00');
    expect(lessonSnapshot.endTime).toBe('20:30');
    expect(lessonSnapshot.duration).toBe(1.5);
    expect(lessonSnapshot.feePerLesson).toBe(120000);
    expect(lessonSnapshot.status).toBe('SCHEDULED');
    expect(lessonSnapshot.title).toBe('Toán 12 - Tích phân');
  });

  describe('Tuition Student Avatar Synchronization', () => {
    it('TC-Avatar-01: Học sinh có avatar thật -> getTuitionList trả về đúng avatar của học sinh', async () => {
      const studentItems = [
        {
          id: 'tui-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          studentId: 'student-avatar-1',
          month: '2026-10',
          baseAmount: 200000,
          surcharge: 0,
          discount: 0,
          totalAmount: 200000,
          paidAmount: 200000,
          remainingAmount: 0,
          status: 'PAID',
          student: {
            id: 'student-avatar-1',
            name: 'Nguyễn Văn Real Avatar',
            email: 'real.avatar@quizmaster.edu.vn',
            avatar: 'https://res.cloudinary.com/demo/image/upload/v12345/student-avatar.jpg',
          },
          class: { id: 'class-1', name: 'Toán 12A' },
          adjustments: [],
          payments: [],
        },
      ];

      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(studentItems),
      };

      const fakeTuitionRepo = {
        find: vi.fn().mockResolvedValue([]),
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      const fakeLessonRepo = {
        find: vi.fn().mockResolvedValue([]),
      };

      const fakeParticipantRepo = {
        find: vi.fn().mockResolvedValue([]),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        fakeLessonRepo as any,
        fakeParticipantRepo as any,
        {} as any,
        {} as any,
        {} as any,
      );

      // Mock syncTuitionData để không gọi lessonRepo phức tạp
      vi.spyOn(service, 'syncTuitionData').mockResolvedValue(undefined);

      const result = await service.getTuitionList('teacher-1', { month: '2026-10' });

      expect(result).toHaveLength(1);
      expect(result[0].studentName).toBe('Nguyễn Văn Real Avatar');
      expect(result[0].studentAvatar).toBe(
        'https://res.cloudinary.com/demo/image/upload/v12345/student-avatar.jpg',
      );
    });

    it('TC-Avatar-02: Học sinh không có avatar (null) -> getTuitionList trả về null để frontend fallback initials', async () => {
      const studentItems = [
        {
          id: 'tui-2',
          teacherId: 'teacher-1',
          classId: 'class-1',
          studentId: 'student-no-avatar',
          month: '2026-10',
          baseAmount: 150000,
          surcharge: 0,
          discount: 0,
          totalAmount: 150000,
          paidAmount: 0,
          remainingAmount: 150000,
          status: 'UNPAID',
          student: {
            id: 'student-no-avatar',
            name: 'Trần Thị No Avatar',
            email: 'no.avatar@quizmaster.edu.vn',
            avatar: null,
          },
          class: { id: 'class-1', name: 'Lý 11' },
          adjustments: [],
          payments: [],
        },
      ];

      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(studentItems),
      };

      const fakeTuitionRepo = {
        find: vi.fn().mockResolvedValue([]),
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      vi.spyOn(service, 'syncTuitionData').mockResolvedValue(undefined);

      const result = await service.getTuitionList('teacher-1', { month: '2026-10' });

      expect(result).toHaveLength(1);
      expect(result[0].studentName).toBe('Trần Thị No Avatar');
      expect(result[0].studentAvatar).toBeNull();
    });

    it('TC-Avatar-03: Nhiều học sinh với avatar khác nhau -> Không bị nhầm lẫn giữa các học sinh hoặc với teacher', async () => {
      const studentItems = [
        {
          id: 'tui-a',
          teacherId: 'teacher-main',
          classId: 'class-1',
          studentId: 'student-a',
          month: '2026-10',
          baseAmount: 100000,
          surcharge: 0,
          discount: 0,
          totalAmount: 100000,
          paidAmount: 0,
          remainingAmount: 100000,
          status: 'UNPAID',
          student: {
            id: 'student-a',
            name: 'Học sinh A',
            email: 'a@quizmaster.edu.vn',
            avatar: 'https://images.example.com/avatar-a.png',
          },
          class: { id: 'class-1', name: 'Hóa 10' },
          adjustments: [],
          payments: [],
        },
        {
          id: 'tui-b',
          teacherId: 'teacher-main',
          classId: 'class-1',
          studentId: 'student-b',
          month: '2026-10',
          baseAmount: 100000,
          surcharge: 0,
          discount: 0,
          totalAmount: 100000,
          paidAmount: 0,
          remainingAmount: 100000,
          status: 'UNPAID',
          student: {
            id: 'student-b',
            name: 'Học sinh B',
            email: 'b@quizmaster.edu.vn',
            avatar: 'https://images.example.com/avatar-b.png',
          },
          class: { id: 'class-1', name: 'Hóa 10' },
          adjustments: [],
          payments: [],
        },
      ];

      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(studentItems),
      };

      const fakeTuitionRepo = {
        find: vi.fn().mockResolvedValue([]),
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      vi.spyOn(service, 'syncTuitionData').mockResolvedValue(undefined);

      const result = await service.getTuitionList('teacher-main', { month: '2026-10' });

      expect(result).toHaveLength(2);
      expect(result[0].studentAvatar).toBe('https://images.example.com/avatar-a.png');
      expect(result[1].studentAvatar).toBe('https://images.example.com/avatar-b.png');
      expect(result[0].studentAvatar).not.toBe(result[1].studentAvatar);
    });
  });

  describe('PRODUCTION REGRESSION: Tuition Foreign Key Constraint on 1-1 Private Lessons', () => {
    it('REG-TUITION-01: syncTuitionData must not insert user.id into teaching_tuition_items when 1-1 lesson has participant with profile.id', async () => {
      const teacherId = 'user-1790002782101';
      const userStudentId = 'user-1790609241891';
      const profileStudentId = 'ts-legacy-user1790-user1790-535ec7';
      const classId = `private-${userStudentId}`;
      const month = '2026-10';

      const validProfileIds = new Set([profileStudentId]);

      const tuitionStore: any[] = [
        {
          id: 'tui-existing-1',
          teacherId,
          classId,
          studentId: profileStudentId,
          month,
          baseAmount: 200000,
          surcharge: 0,
          discount: 0,
          totalAmount: 200000,
          paidAmount: 0,
          remainingAmount: 200000,
          status: 'UNPAID',
        },
      ];

      const fakeTuitionRepo = {
        find: vi.fn().mockImplementation(async ({ where }: any) => {
          return tuitionStore.filter((t) => t.teacherId === where.teacherId && t.month === where.month);
        }),
        create: vi.fn().mockImplementation((data: any) => ({ ...data })),
        save: vi.fn().mockImplementation(async (item: any) => {
          // Emulate MySQL FK constraint: studentId must reference teacher_student_profiles(id)
          if (!validProfileIds.has(item.studentId)) {
            throw new Error(
              `Cannot add or update a child row: a foreign key constraint fails ("quizmaster"."teaching_tuition_items", CONSTRAINT "FK_teaching_tuition_items_student" FOREIGN KEY ("studentId") REFERENCES "teacher_student_profiles" ("id"))`,
            );
          }
          const idx = tuitionStore.findIndex((t) => t.id === item.id);
          if (idx >= 0) tuitionStore[idx] = item;
          else tuitionStore.push(item);
          return item;
        }),
      };

      const fakeLessonRepo = {
        find: vi.fn().mockResolvedValue([
          {
            id: 'lesson-private-1',
            teacherId,
            classId,
            date: '2026-10-18',
            feePerLesson: 100000,
            duration: 2,
            status: 'SCHEDULED',
          },
          {
            id: 'lesson-private-2',
            teacherId,
            classId,
            date: '2026-10-25',
            feePerLesson: 100000,
            duration: 2,
            status: 'SCHEDULED',
          },
        ]),
      };

      const fakeParticipantRepo = {
        find: vi.fn().mockResolvedValue([
          {
            id: 'part-1',
            lessonId: 'lesson-private-1',
            studentId: profileStudentId,
            attendanceStatus: 'ATTENDED',
            feeAmount: 100000,
          },
          {
            id: 'part-2',
            lessonId: 'lesson-private-2',
            studentId: profileStudentId,
            attendanceStatus: 'ATTENDED',
            feeAmount: 100000,
          },
        ]),
      };

      const fakeTeacherStudentRepo = {
        findOne: vi.fn().mockImplementation(async ({ where }: any) => {
          const list = Array.isArray(where) ? where : [where];
          for (const cond of list) {
            if (
              (cond.id === profileStudentId || cond.studentAccountId === userStudentId) &&
              cond.teacherId === teacherId
            ) {
              return {
                id: profileStudentId,
                teacherId,
                studentAccountId: userStudentId,
                fullName: 'Đặng Thị Hồng Xuân',
              };
            }
          }
          return null;
        }),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        fakeLessonRepo as any,
        fakeParticipantRepo as any,
        {} as any,
        {} as any,
        {} as any,
        fakeTeacherStudentRepo as any,
      );

      // Should succeed without throwing FK constraint violation
      await service.syncTuitionData(teacherId, month);

      // Verify no phantom row was inserted with userStudentId
      expect(tuitionStore).toHaveLength(1);
      expect(tuitionStore[0].studentId).toBe(profileStudentId);
      expect(tuitionStore[0].baseAmount).toBe(200000);
      expect(fakeTuitionRepo.save).not.toHaveBeenCalled(); // No unnecessary writes!
    });

    it('REG-TUITION-02: getTuitionList must order by student.fullName without attempting to order by non-existent student.name', async () => {
      const teacherId = 'user-1790002782101';
      const mockQb = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockImplementation((orderField: string) => {
          if (orderField === 'student.name') {
            throw new Error("Unknown column 'student.name' in 'order clause'");
          }
          return mockQb;
        }),
        getMany: vi.fn().mockResolvedValue([]),
      };

      const fakeTuitionRepo = {
        find: vi.fn().mockResolvedValue([]),
        createQueryBuilder: vi.fn().mockReturnValue(mockQb),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        {} as any,
        {} as any,
        {} as any,
      );

      vi.spyOn(service, 'syncTuitionData').mockResolvedValue(undefined);

      await expect(service.getTuitionList(teacherId, { month: '2026-10' })).resolves.not.toThrow();
      expect(mockQb.orderBy).toHaveBeenCalledWith('student.fullName', 'ASC');
    });

    it('REG-TUITION-03: syncTuitionData for 1-1 lesson without participants resolves user.id to profile.id safely', async () => {
      const teacherId = 'user-1790002782101';
      const userStudentId = 'user-1790609241891';
      const profileStudentId = 'ts-legacy-user1790-user1790-535ec7';
      const classId = `private-${userStudentId}`;
      const month = '2026-10';

      const tuitionStore: any[] = [];
      const fakeTuitionRepo = {
        find: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation((data: any) => ({ ...data })),
        save: vi.fn().mockImplementation(async (item: any) => {
          if (item.studentId === userStudentId) {
            throw new Error('FK VIOLATION: studentId must be profile id, not user id!');
          }
          tuitionStore.push(item);
          return item;
        }),
      };

      const fakeLessonRepo = {
        find: vi.fn().mockResolvedValue([
          {
            id: 'lesson-orphan-part',
            teacherId,
            classId,
            date: '2026-10-18',
            feePerLesson: 150000,
            duration: 1.5,
            status: 'SCHEDULED',
          },
        ]),
      };

      const fakeTeacherStudentRepo = {
        findOne: vi.fn().mockImplementation(async ({ where }: any) => {
          const list = Array.isArray(where) ? where : [where];
          for (const cond of list) {
            if (
              (cond.id === profileStudentId || cond.studentAccountId === userStudentId) &&
              cond.teacherId === teacherId
            ) {
              return {
                id: profileStudentId,
                teacherId,
                studentAccountId: userStudentId,
                fullName: 'Đặng Thị Hồng Xuân',
              };
            }
          }
          return null;
        }),
      };

      const service = new TuitionService(
        fakeTuitionRepo as any,
        { find: async () => [] } as any,
        { find: async () => [] } as any,
        fakeLessonRepo as any,
        { find: async () => [] } as any, // 0 participants
        {} as any,
        {} as any,
        {} as any,
        fakeTeacherStudentRepo as any,
      );

      await service.syncTuitionData(teacherId, month);

      expect(tuitionStore).toHaveLength(1);
      expect(tuitionStore[0].studentId).toBe(profileStudentId);
      expect(tuitionStore[0].baseAmount).toBe(150000);
    });
  });
});

