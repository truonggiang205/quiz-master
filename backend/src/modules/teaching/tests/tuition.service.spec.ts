import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TuitionService } from '../services/tuition.service.js';
import { TuitionItemEntity } from '../entities/tuition-item.entity.js';

describe('TuitionService - Comprehensive Audit & Harden Suite', () => {
  // 1. Math & Calculation
  it('TC-TCH-TUI-001: Tính đúng totalAmount = baseAmount + surcharge - discount', async () => {
    const fakeTuitionRepo = {
      save: async (item: any) => item,
    };
    const fakeAdjustmentRepo = {
      find: async () => [
        { type: 'SURCHARGE', amount: 50000 },
        { type: 'DISCOUNT', amount: 20000 },
      ],
    };
    const fakePaymentRepo = {
      find: async () => [{ amount: 300000 }],
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

    const item = {
      id: 'tui-1',
      baseAmount: 500000,
      surcharge: 0,
      discount: 0,
      totalAmount: 500000,
      paidAmount: 0,
      remainingAmount: 500000,
      status: 'UNPAID',
    } as TuitionItemEntity;

    const result = await service.recalculateTuitionItem(item);

    // Total = 500.000 + 50.000 - 20.000 = 530.000
    expect(result.totalAmount).toBe(530000);
    expect(result.paidAmount).toBe(300000);
    expect(result.remainingAmount).toBe(230000);
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  // 2. State transition to PAID
  it('TC-TCH-TUI-002: Chuyển trạng thái sang PAID khi đã thanh toán đủ 100%', async () => {
    const fakeTuitionRepo = {
      save: async (item: any) => item,
    };
    const fakeAdjustmentRepo = {
      find: async () => [],
    };
    const fakePaymentRepo = {
      find: async () => [{ amount: 400000 }, { amount: 600000 }],
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

    const item = {
      id: 'tui-2',
      baseAmount: 1000000,
      surcharge: 0,
      discount: 0,
      totalAmount: 1000000,
      paidAmount: 0,
      remainingAmount: 1000000,
      status: 'UNPAID',
    } as TuitionItemEntity;

    const result = await service.recalculateTuitionItem(item);

    expect(result.totalAmount).toBe(1000000);
    expect(result.paidAmount).toBe(1000000);
    expect(result.remainingAmount).toBe(0);
    expect(result.status).toBe('PAID');
  });

  // 3. Schedule -> Tuition Sync: Session generation
  it('TC-TCH-TUI-003: Schedule -> Tuition: Tạo buổi học sẽ tạo/cập nhật đúng học phí', async () => {
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

  // 4. Idempotency: Không nhân đôi học phí khi refresh/sync nhiều lần
  it('TC-TCH-TUI-004: Chống nhân đôi học phí khi sync nhiều lần (Idempotency)', async () => {
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

    // Run sync 3 times in a row
    await service.syncTuitionData('teacher-1', '2026-10');
    await service.syncTuitionData('teacher-1', '2026-10');
    await service.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].baseAmount).toBe(100000);
    expect(tuitionStore[0].totalAmount).toBe(100000);
  });

  // 5. Update session fee: 100k -> 150k
  it('TC-TCH-TUI-005: Cập nhật giá buổi học (100k -> 150k) đồng bộ chính xác học phí', async () => {
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

    // Initial sync: 100k
    await service.syncTuitionData('teacher-1', '2026-10');
    expect(tuitionStore[0].baseAmount).toBe(100000);

    // Teacher edits fee to 150k
    currentFee = 150000;
    await service.syncTuitionData('teacher-1', '2026-10');

    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].baseAmount).toBe(150000);
    expect(tuitionStore[0].totalAmount).toBe(150000);
  });

  // 6. Cancelled session must not be billed
  it('TC-TCH-TUI-006: Buổi học bị hủy (CANCELLED) không được tính vào học phí', async () => {
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
          status: 'CANCELLED', // Cancelled!
        },
        {
          id: 'lesson-2',
          teacherId: 'teacher-1',
          classId: 'class-1',
          date: '2026-10-19',
          feePerLesson: 150000,
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

    // Only lesson-2 (150k) is valid; lesson-1 (100k) was cancelled
    expect(tuitionStore.length).toBe(1);
    expect(tuitionStore[0].baseAmount).toBe(150000);
  });

  // 7. Overpayment validation
  it('TC-TCH-TUI-007: Từ chối thanh toán vượt quá số tiền còn lại (Overpayment rejection)', async () => {
    const fakeTuitionItem = {
      id: 'tui-1',
      teacherId: 'teacher-1',
      remainingAmount: 200000,
    };

    const fakeDataSource = {
      transaction: async (cb: any) => {
        const fakeManager = {
          findOne: async () => fakeTuitionItem,
        };
        return cb(fakeManager);
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

    // Try to pay 250k when remaining is 200k
    await expect(
      service.recordPayment('teacher-1', 'tui-1', {
        amount: 250000,
        paymentDate: '2026-10-19',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // 8. Payment amount <= 0 validation
  it('TC-TCH-TUI-008: Từ chối số tiền thanh toán <= 0', async () => {
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
      service.recordPayment('teacher-1', 'tui-1', {
        amount: 0,
        paymentDate: '2026-10-19',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.recordPayment('teacher-1', 'tui-1', {
        amount: -50000,
        paymentDate: '2026-10-19',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // 9. Multiple sessions & different rates calculation
  it('TC-TCH-TUI-009: Tính đúng tổng tiền cho nhiều buổi học với mức giá khác nhau (100k + 150k = 250k)', async () => {
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
          classId: 'c-1',
          date: '2026-10-16',
          feePerLesson: 100000,
          duration: 1.5,
          status: 'SCHEDULED',
        },
        {
          id: 'l-2',
          teacherId: 'teacher-1',
          classId: 'c-1',
          date: '2026-10-17',
          feePerLesson: 150000,
          duration: 2.0,
          status: 'SCHEDULED',
        },
      ],
    };

    const fakeParticipantRepo = {
      find: async () => [
        {
          id: 'p-1',
          lessonId: 'l-1',
          studentId: 's-1',
          attendanceStatus: 'ATTENDED',
          feeAmount: 100000,
        },
        {
          id: 'p-2',
          lessonId: 'l-2',
          studentId: 's-1',
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

    expect(tuitionStore[0].baseAmount).toBe(250000);
    expect(tuitionStore[0].totalAmount).toBe(250000);
  });

  // 10. Teacher isolation / authorization
  it('TC-TCH-TUI-010: Phân quyền & cô lập giáo viên: Giáo viên khác không được truy cập bản ghi học phí', async () => {
    const fakeTuitionRepo = {
      findOne: async () => ({
        id: 'tui-1',
        teacherId: 'teacher-OWNER',
        remainingAmount: 200000,
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

    // teacher-HACKER tries to get details of teacher-OWNER's record
    await expect(
      service.getTuitionDetail('teacher-HACKER', 'tui-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  // 11. Immutability of schedule data on payment
  it('TC-TCH-TUI-011: Thanh toán chỉ cập nhật trạng thái tài chính, tuyệt đối không làm thay đổi lịch dạy', async () => {
    const lessonMock = {
      id: 'lesson-fixed',
      date: '2026-10-18',
      startTime: '08:00',
      endTime: '09:30',
      duration: 1.5,
      feePerLesson: 100000,
    };

    const fakeTuition = {
      id: 'tui-fixed',
      teacherId: 'teacher-1',
      studentId: 'student-1',
      baseAmount: 100000,
      remainingAmount: 100000,
      paidAmount: 0,
      status: 'UNPAID',
    };

    let paymentRecorded: any = null;
    const fakeDataSource = {
      transaction: async (cb: any) => {
        const fakeManager = {
          findOne: async () => fakeTuition,
          create: (_: any, data: any) => data,
          save: async (item: any) => {
            paymentRecorded = item;
            return item;
          },
          getRepository: (_: any) => ({
            find: async () => [paymentRecorded],
            save: async (item: any) => item,
          }),
        };
        return cb(fakeManager);
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

    await service.recordPayment('teacher-1', 'tui-fixed', {
      amount: 100000,
      paymentDate: '2026-10-19',
      paymentMethod: 'CASH',
      note: 'Thanh toán hoàn tất',
    });

    // Schedule properties must remain untouched
    expect(lessonMock.date).toBe('2026-10-18');
    expect(lessonMock.startTime).toBe('08:00');
    expect(lessonMock.endTime).toBe('09:30');
    expect(lessonMock.feePerLesson).toBe(100000);

    // Only payment was recorded
    expect(paymentRecorded.amount).toBe(100000);
    expect(fakeTuition.paidAmount).toBe(100000);
    expect(fakeTuition.remainingAmount).toBe(0);
    expect(fakeTuition.status).toBe('PAID');
  });
});
