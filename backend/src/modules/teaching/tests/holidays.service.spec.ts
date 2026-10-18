import { describe, it, expect, beforeEach } from 'vitest';
import { HolidaysService } from '../services/holidays.service';

describe('HolidaysService', () => {
  let service: HolidaysService;

  beforeEach(() => {
    service = new HolidaysService();
  });

  it('should return holidays for a specified year', () => {
    const holidays = service.getHolidays({ year: 2026 });
    expect(holidays).toBeDefined();
    expect(holidays.length).toBeGreaterThan(0);

    const names = holidays.map((h) => h.name);
    expect(names).toContain('Tết Dương Lịch');
    expect(names.some((n) => n.includes('Tết Nguyên Đán'))).toBe(true);
    expect(names).toContain('Giỗ Tổ Hùng Vương');
    expect(names).toContain('Giải Phóng Miền Nam');
    expect(names).toContain('Quốc Tế Lao Động');
    expect(names).toContain('Quốc Khánh');
  });

  it('should filter holidays by date range', () => {
    // 30/4 and 1/5
    const holidays = service.getHolidays({ from: '2026-04-25', to: '2026-05-05' });
    const names = holidays.map((h) => h.name);

    expect(names).toContain('Giải Phóng Miền Nam');
    expect(names).toContain('Quốc Tế Lao Động');
    expect(names).toContain('Giỗ Tổ Hùng Vương'); // 2026-04-26
    expect(names).not.toContain('Tết Dương Lịch');
  });

  it('should check if a specific date is a holiday', () => {
    expect(service.getHolidayForDate('2026-09-02')).not.toBeNull();
    expect(service.getHolidayForDate('2026-09-03')).not.toBeNull();
    expect(service.getHolidayForDate('2026-07-15')).toBeNull();
  });

  it('should get correct holiday metadata for a specific date', () => {
    const holiday = service.getHolidayForDate('2026-04-30');
    expect(holiday).toBeDefined();
    expect(holiday?.name).toBe('Giải Phóng Miền Nam');
    expect(holiday?.type).toBe('PUBLIC_HOLIDAY');
  });
});
