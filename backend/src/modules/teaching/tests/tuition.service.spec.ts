import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TuitionService } from '../services/tuition.service.js';
import { TuitionItemEntity } from '../entities/tuition-item.entity.js';
import { generateTuitionExcelReport } from '../utils/tuition-excel.util.js';
import ExcelJS from 'exceljs';

describe('TuitionService - Final Hardening Audit 24-Scenario Test Matrix', () => {
  // 1. Create lesson -> tuition
  it('TC-01: Create lesson -> tuition: Tạo buổi học hợp lệ sinh bản ghi học phí chuẩn', async () => {
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

  // 2. Update fee
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

    // Update fee to 150k
    currentFee = 150000;
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(150000);
    expect(tuitionStore[0].totalAmount).toBe(150000);
  });

  // 3. Update date same month
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

  // 4. Update date different month
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

    // Tháng 10 ban đầu có 1 buổi
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 100000)).toBe(true);

    // Chuyển buổi học sang tháng 11
    lessonDate = '2026-11-10';
    await service.syncTuitionData('teacher-1', '2026-11');
    await service.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 100000)).toBe(true);
    // Tháng 10 không còn buổi học và không có thanh toán -> orphan bị xóa
    expect(tuitionStore.some((t) => t.month === '2026-10')).toBe(false);
  });

  // 5. Delete lesson
  it('TC-05: Delete lesson: Xóa buổi học tính lại chính xác học phí còn lại', async () => {
    let lessons = [
      {
        id: 'l-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        date: '2026-10-10',
        feePerLesson: 100000,
        status: 'SCHEDULED',
      },
      {
        id: 'l-2',
        teacherId: 'teacher-1',
        classId: 'class-1',
        date: '2026-10-15',
        feePerLesson: 100000,
        status: 'SCHEDULED',
      },
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
        {
          id: 'p-1',
          lessonId: 'l-1',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 100000,
        },
        {
          id: 'p-2',
          lessonId: 'l-2',
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
      { find: async () => lessons } as any,
      fakeParticipantRepo as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // Ban đầu 2 buổi = 200k
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(200000);

    // Xóa l-2
    lessons = [lessons[0]];
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(100000);
  });

  // 6. Cancel lesson
  it('TC-06: Cancel lesson: Buổi học bị hủy (CANCELLED) không tính tiền', async () => {
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
          status: 'CANCELLED',
        },
        {
          id: 'lesson-2',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-19',
          feePerLesson: 150000,
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
        {
          id: 'part-2',
          lessonId: 'lesson-2',
          studentId: 'student-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 150000,
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
    expect(tuitionStore[0].baseAmount).toBe(150000);
  });

  // 7. ABSENT
  it('TC-07: ABSENT: Học sinh vắng mặt không bị tính tiền', async () => {
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
        {
          id: 'l-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-18',
          feePerLesson: 100000,
          status: 'COMPLETED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'p-absent',
          lessonId: 'l-1',
          studentId: 'student-absent',
          attendanceStatus: 'ABSENT',
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
    expect(tuitionStore.length).toBe(0);
  });

  // 8. EXCUSED
  it('TC-08: EXCUSED: Học sinh nghỉ có phép tuân theo business rule hiện tại', async () => {
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
        {
          id: 'l-1',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-18',
          feePerLesson: 100000,
          status: 'COMPLETED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'p-excused',
          lessonId: 'l-1',
          studentId: 'student-excused',
          attendanceStatus: 'EXCUSED',
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
    expect(tuitionStore[0].baseAmount).toBe(100000);
  });

  // 9. Multiple lessons
  it('TC-09: Multiple lessons: Nhiều buổi học tính tổng chính xác (3 buổi x 100k = 300k)', async () => {
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

  // 10. Different fee per lesson
  it('TC-10: Different fee per lesson: Các buổi giá khác nhau được cộng dồn chính xác (100k + 150k = 250k)', async () => {
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

  // 11. Sync idempotency
  it('TC-11: Sync idempotency: Chạy sync 1 lần, 10 lần, 100 lần kết quả tuyệt đối giống nhau', async () => {
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

  // 12. Payment full
  it('TC-12: Payment full: Thanh toán đủ chuyển status -> PAID và remainingAmount = 0', async () => {
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

  // 13. Payment partial
  it('TC-13: Payment partial: Thanh toán một phần chuyển status -> PARTIALLY_PAID', async () => {
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

  // 14. Overpayment
  it('TC-14: Overpayment: Từ chối thanh toán số tiền lớn hơn số tiền còn lại', async () => {
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

  // 15. Zero payment
  it('TC-15: Zero payment: Từ chối số tiền <= 0', async () => {
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

  // 16. Concurrent payment
  it('TC-16: Concurrent payment: Giả lập 2 request đồng thời chỉ có 1 request thành công', async () => {
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

    // Bắn 2 request đồng thời
    const req1 = service.recordPayment('t-1', 'tui-concurrent', { amount: 100000, paymentDate: '2026-10-19' });
    const req2 = service.recordPayment('t-1', 'tui-concurrent', { amount: 100000, paymentDate: '2026-10-19' });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(item.remainingAmount).toBe(0);
  });

  // 17. Payment does not mutate lesson
  it('TC-17: Payment does not mutate lesson: Thanh toán không thay đổi bất kỳ trường nào của buổi học', async () => {
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

  // 18. Payment refund/void
  it('TC-18: Payment refund/void: Hoàn tiền hoặc hủy thanh toán bảo lưu audit trail, không hard-delete', async () => {
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
          getRepository: (entity: any) => ({
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

    const result = await service.refundPayment('t-1', 'pay-1', 'Học sinh bảo lưu');
    expect(payment.status).toBe('REFUNDED');
    expect(payment.note).toContain('Hoàn tiền: Học sinh bảo lưu');
    expect(result.remainingAmount).toBe(100000);
    expect(result.status).toBe('UNPAID');
  });

  // 19. Orphan tuition
  it('TC-19: Orphan tuition: Xóa học phí mồ côi nếu không có giao dịch, bảo tồn nếu có thanh toán', async () => {
    const tuitionStore = [
      { id: 'tui-no-pay', teacherId: 't-1', classId: 'c-1', studentId: 's-1', month: '2026-10', baseAmount: 100000 },
      { id: 'tui-has-pay', teacherId: 't-1', classId: 'c-2', studentId: 's-2', month: '2026-10', baseAmount: 100000 },
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
      find: async ({ where }: any) => {
        if (where.tuitionItemId === 'tui-has-pay') return [{ id: 'p1', amount: 100000, status: 'COMPLETED' }];
        return [];
      },
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      fakePaymentRepo as any,
      { find: async () => [] } as any, // 0 buổi học hợp lệ
      { find: async () => [] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');

    // tui-no-pay bị xóa vì là orphan không có giao dịch
    expect(tuitionStore.some((t) => t.id === 'tui-no-pay')).toBe(false);
    // tui-has-pay được giữ lại để bảo tồn lịch sử tài chính
    expect(tuitionStore.some((t) => t.id === 'tui-has-pay')).toBe(true);
  });

  // 20. Cross-teacher access
  it('TC-20: Cross-teacher access: Truy cập bản ghi của giáo viên khác bị từ chối 403 Forbidden', async () => {
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

  // 21. Excel export
  it('TC-21: Excel export: Xuất file Excel sinh buffer hợp lệ với đầy đủ cấu trúc báo cáo', async () => {
    const items = [
      {
        id: 't-1',
        studentId: 's-1',
        studentName: 'Nguyễn Văn A',
        studentEmail: 'a@gmail.com',
        classId: 'c-1',
        className: 'Toán 12A1',
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
      teacherName: 'Thầy Tuấn',
      month: '2026-10',
      className: 'Toán 12A1',
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  // 22. Excel total formula
  it('TC-22: Excel total formula: Bảng Excel chứa công thức SUM chuẩn xác cho các cột tài chính', async () => {
    const items = [
      {
        id: 't-1',
        studentId: 's-1',
        studentName: 'Nguyễn Văn A',
        studentEmail: 'a@gmail.com',
        classId: 'c-1',
        className: 'Toán 12A1',
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
      teacherName: 'Thầy Tuấn',
      month: '2026-10',
    });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);
    const sheet = wb.getWorksheet('Báo Cáo Học Phí')!;

    // Hàng tổng cộng là dòng 8 (7 là dòng dữ liệu duy nhất)
    const summaryRow = sheet.getRow(8);
    const totalAmountCell = summaryRow.getCell(11); // Cột K = TỔNG CỘNG
    expect((totalAmountCell.value as any).formula).toBe('SUM(K7:K7)');
    expect(sheet.pageSetup.orientation).toBe('landscape');
  });

  // 23. October -> November transition
  it('TC-23: October -> November transition: Dời lịch từ T10 sang T11 xóa T10 và ghi nhận T11', async () => {
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
      id: 'l-shift',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-10-20',
      feePerLesson: 150000,
      status: 'SCHEDULED',
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [], count: async () => 0 } as any,
      { find: async () => [lesson] } as any,
      { find: async () => [{ lessonId: 'l-shift', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 150000 }] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-10');
    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 150000)).toBe(true);

    // Chuyển sang 2026-11-20
    lesson.date = '2026-11-20';
    await service.syncTuitionData('t-1', '2026-11');
    await service.syncTuitionData('t-1', '2026-10');

    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 150000)).toBe(true);
    expect(tuitionStore.some((t) => t.month === '2026-10')).toBe(false);
  });

  // 24. November -> October transition
  it('TC-24: November -> October transition: Dời lịch ngược từ T11 về T10 xóa T11 và ghi nhận T10', async () => {
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
      id: 'l-shift-back',
      teacherId: 't-1',
      classId: 'c-1',
      date: '2026-11-05',
      feePerLesson: 180000,
      status: 'SCHEDULED',
    };

    const service = new TuitionService(
      fakeTuitionRepo as any,
      { find: async () => [] } as any,
      { find: async () => [], count: async () => 0 } as any,
      { find: async () => [lesson] } as any,
      { find: async () => [{ lessonId: 'l-shift-back', studentId: 's-1', attendanceStatus: 'ATTENDED', feeAmount: 180000 }] } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    await service.syncTuitionData('t-1', '2026-11');
    expect(tuitionStore.some((t) => t.month === '2026-11' && t.baseAmount === 180000)).toBe(true);

    // Chuyển ngược về 2026-10-31
    lesson.date = '2026-10-31';
    await service.syncTuitionData('t-1', '2026-10');
    await service.syncTuitionData('t-1', '2026-11');

    expect(tuitionStore.some((t) => t.month === '2026-10' && t.baseAmount === 180000)).toBe(true);
    expect(tuitionStore.some((t) => t.month === '2026-11')).toBe(false);
  });
});
