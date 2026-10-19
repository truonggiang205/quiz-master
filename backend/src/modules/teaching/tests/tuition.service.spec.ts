import { describe, it, expect } from 'vitest';
import { TuitionService } from '../services/tuition.service.js';
import { TuitionItemEntity } from '../entities/tuition-item.entity.js';

describe('TuitionService - Business Calculations', () => {
  it('TC-TCH-TUI-UNIT-001: Tính đúng totalAmount = baseAmount + surcharge - discount', async () => {
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
      find: async () => [
        { amount: 300000 },
      ],
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
    // Paid = 300.000
    expect(result.paidAmount).toBe(300000);
    // Remaining = 230.000
    expect(result.remainingAmount).toBe(230000);
    // Status should be PARTIALLY_PAID
    expect(result.status).toBe('PARTIALLY_PAID');
  });

  it('TC-TCH-TUI-UNIT-002: Chuyển trạng thái sang PAID khi đã thanh toán đủ 100%', async () => {
    const fakeTuitionRepo = {
      save: async (item: any) => item,
    };
    const fakeAdjustmentRepo = {
      find: async () => [],
    };
    const fakePaymentRepo = {
      find: async () => [
        { amount: 400000 },
        { amount: 600000 },
      ],
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

  it('TC-TCH-TUI-UNIT-003: bulkPayment tự động tạo payment với remainingAmount của học sinh', async () => {
    const savedPayments: any[] = [];
    const fakeTuitionRepo = {
      findOne: async ({ where }: any) => {
        if (where.id === 'tui-1') {
          return {
            id: 'tui-1',
            teacherId: 'teacher-1',
            studentId: 'student-1',
            baseAmount: 500000,
            surcharge: 0,
            discount: 0,
            totalAmount: 500000,
            paidAmount: 0,
            remainingAmount: 500000,
            status: 'UNPAID',
          };
        }
        return null;
      },
      save: async (item: any) => item,
    };
    const fakeAdjustmentRepo = {
      find: async () => [],
    };
    const fakePaymentRepo = {
      create: (data: any) => data,
      save: async (data: any) => {
        savedPayments.push(data);
        return data;
      },
      find: async () => savedPayments,
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

    const results = await service.bulkPayment('teacher-1', {
      tuitionIds: ['tui-1'],
      paymentDate: '2026-10-19',
      paymentMethod: 'CASH',
      note: 'Thanh toán hàng loạt',
    });

    expect(results.length).toBe(1);
    expect(savedPayments.length).toBe(1);
    expect(savedPayments[0].amount).toBe(500000);
    expect(results[0].status).toBe('PAID');
  });
});

