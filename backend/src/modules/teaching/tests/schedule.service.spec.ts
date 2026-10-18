import { describe, it, expect } from 'vitest';
import { ScheduleService } from '../services/schedule.service.js';
import { BadRequestException } from '@nestjs/common';

describe('ScheduleService - Logic & Validations', () => {
  const service = new ScheduleService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  it('TC-TCH-SCH-UNIT-001: Tính chính xác thời lượng duration từ giờ bắt đầu và kết thúc', () => {
    // 18:00 -> 19:30 = 1.5 giờ
    const duration = service.calculateDuration('18:00', '19:30');
    expect(duration).toBe(1.5);

    // 08:00 -> 10:00 = 2 giờ
    expect(service.calculateDuration('08:00', '10:00')).toBe(2);

    // 14:15 -> 15:45 = 1.5 giờ
    expect(service.calculateDuration('14:15', '15:45')).toBe(1.5);
  });

  it('TC-TCH-SCH-UNIT-002: Bắt lỗi khi giờ kết thúc nhỏ hơn hoặc bằng giờ bắt đầu', () => {
    // endTime == startTime
    expect(() => service.calculateDuration('18:00', '18:00')).toThrow(BadRequestException);

    // endTime < startTime
    expect(() => service.calculateDuration('19:30', '18:00')).toThrow(BadRequestException);
  });

  it('TC-TCH-SCH-UNIT-003: Bắt lỗi khi định dạng giờ không hợp lệ', () => {
    expect(() => service.calculateDuration('25:00', '26:00')).toThrow(BadRequestException);
    expect(() => service.calculateDuration('abc', '18:00')).toThrow(BadRequestException);
  });
});
