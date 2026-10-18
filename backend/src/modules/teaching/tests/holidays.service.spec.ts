import { describe, it, expect, beforeEach } from 'vitest';
import { HolidaysService, getVietnamDayType } from '../services/holidays.service.js';
import type { HolidayDto } from '../dto/holiday.dto.js';
import { BadRequestException } from '@nestjs/common';

describe('HolidaysService (Architecture & Semantic Cleanup)', () => {
  let service: HolidaysService;

  beforeEach(() => {
    service = new HolidaysService();
  });

  // 1. Official Source Consistency: official > fixed > lunar_calculated
  describe('1. Official Source Consistency & Priority Hierarchy', () => {
    it('should assign source = OFFICIAL and isOfficialSchedule = true for official decrees', () => {
      // 2025 30/4 has official decree
      const h2025 = service.getHolidayForDate('2025-04-30');
      expect(h2025).toBeDefined();
      expect(h2025?.source).toBe('OFFICIAL');
      expect(h2025?.isOfficialSchedule).toBe(true);
      expect(h2025?.occasion).toBe('PUBLIC_HOLIDAY');
    });

    it('should assign source = FIXED and isOfficialSchedule = false when falling back to fixed rule', () => {
      // 2026 30/4 has NO official decree yet -> fallback to fixed rule
      const h2026 = service.getHolidayForDate('2026-04-30');
      expect(h2026).toBeDefined();
      expect(h2026?.source).toBe('FIXED');
      expect(h2026?.isOfficialSchedule).toBe(false);
      expect(h2026?.occasion).toBe('PUBLIC_HOLIDAY');
      expect(h2026?.workStatus).toBe('REST_DAY');
    });

    it('should strictly override FIXED and LUNAR_CALCULATED when an official schedule is added', () => {
      // Before: 2026-04-26 is calculated lunar Giỗ Tổ
      const before = service.getHolidayForDate('2026-04-26');
      expect(before?.source).toBe('LUNAR_CALCULATED');
      expect(before?.isOfficialSchedule).toBe(false);

      // Dynamically register an official schedule for 2026-04-26
      service.registerOfficialSchedule({
        id: 'official-hung-vuong-2026',
        name: 'Giỗ Tổ Hùng Vương (Công văn chính thức)',
        year: 2026,
        date: '2026-04-26',
        occasion: 'PUBLIC_HOLIDAY',
        workStatus: 'REST_DAY',
        scope: 'GENERAL',
        description: 'Lịch nghỉ chính thức phê duyệt bởi Bộ LĐ-TB&XH',
      });

      // After: official decree immediately takes precedence
      const after = service.getHolidayForDate('2026-04-26');
      expect(after?.name).toContain('Công văn chính thức');
      expect(after?.source).toBe('OFFICIAL');
      expect(after?.isOfficialSchedule).toBe(true);
    });
  });

  // 2. Data-Driven Official Schedules (No hardcoded 2024-2028 range)
  describe('2. Data-Driven Official Data Model', () => {
    it('can resolve official schedules for newly registered future year without touching resolver logic', () => {
      service.registerOfficialSchedule({
        id: 'tet-2035-decree',
        name: 'Tết Nguyên Đán 2035 (Nghị quyết Chính phủ)',
        year: 2035,
        date: '2035-02-08',
        endDate: '2035-02-15',
        occasion: 'PUBLIC_HOLIDAY',
        workStatus: 'REST_DAY',
        scope: 'GENERAL',
        description: 'Lịch nghỉ Tết 2035 chính thức',
      });

      const h2035 = service.getHolidayForDate('2035-02-10');
      expect(h2035).toBeDefined();
      expect(h2035?.name).toContain('Nghị quyết Chính phủ');
      expect(h2035?.source).toBe('OFFICIAL');
      expect(h2035?.isOfficialSchedule).toBe(true);
    });
  });

  // 3. Separation of Rest Day and Public Holiday (4 Quadrants)
  describe('3. Rest Day vs Public Holiday Semantic Separation', () => {
    it('Quadrant A: PUBLIC_HOLIDAY + REST_DAY (Quốc khánh 02/09)', () => {
      const qk = service.getHolidayForDate('2026-09-02');
      expect(qk?.occasion).toBe('PUBLIC_HOLIDAY');
      expect(qk?.workStatus).toBe('REST_DAY');
    });

    it('Quadrant B: NONE + REST_DAY (Nghỉ hoán đổi)', () => {
      const swapped = service.getHolidayForDate('2025-05-02');
      expect(swapped?.occasion).toBe('NONE');
      expect(swapped?.workStatus).toBe('REST_DAY');
    });

    it('Quadrant C: NONE + MAKEUP_WORKING_DAY (Làm việc bù)', () => {
      const makeup = service.getHolidayForDate('2025-04-26');
      expect(makeup?.occasion).toBe('NONE');
      expect(makeup?.workStatus).toBe('MAKEUP_WORKING_DAY');
      expect(makeup?.dayType).toBe('SATURDAY');
    });

    it('Quadrant D: SPECIAL_DAY + WORKING_DAY (20/11 Nhà giáo VN, 08/03)', () => {
      const teacher = service.getHolidayForDate('2026-11-20');
      expect(teacher?.occasion).toBe('SPECIAL_DAY');
      expect(teacher?.workStatus).toBe('WORKING_DAY');

      const women = service.getHolidayForDate('2026-03-08');
      expect(women?.occasion).toBe('SPECIAL_DAY');
      expect(women?.workStatus).toBe('WORKING_DAY');
    });
  });

  // 4. Giỗ Tổ Hùng Vương
  describe('4. Giỗ Tổ Hùng Vương Classification', () => {
    it('must have occasion = PUBLIC_HOLIDAY (never LUNAR_HOLIDAY)', () => {
      const hungVuong = service.getHolidayForDate('2026-04-26');
      expect(hungVuong?.name).toContain('Giỗ Tổ Hùng Vương');
      expect(hungVuong?.occasion).toBe('PUBLIC_HOLIDAY');
      expect((hungVuong as any)?.occasion).not.toBe('LUNAR_HOLIDAY');
      expect(hungVuong?.workStatus).toBe('REST_DAY');
    });
  });

  // 5. Quốc Khánh Contiguous Days
  describe('5. Quốc Khánh Annual Decrees', () => {
    it('handles 2024 contiguous day AFTER (03/09/2024)', () => {
      const qk2024 = service.getHolidayForDate('2024-09-03');
      expect(qk2024).toBeDefined();
      expect(qk2024?.name).toContain('liền kề');
      expect(qk2024?.occasion).toBe('PUBLIC_HOLIDAY');
      expect(qk2024?.workStatus).toBe('REST_DAY');
    });

    it('handles 2025 contiguous day BEFORE (01/09/2025)', () => {
      const qk2025 = service.getHolidayForDate('2025-09-01');
      expect(qk2025).toBeDefined();
      expect(qk2025?.name).toContain('liền kề trước');
      expect(qk2025?.occasion).toBe('PUBLIC_HOLIDAY');
      expect(qk2025?.workStatus).toBe('REST_DAY');

      // 03/09/2025 is NOT a holiday
      expect(service.getHolidayForDate('2025-09-03')).toBeNull();
    });

    it('does not hardcode 03/09 for future years without decree', () => {
      expect(service.getHolidayForDate('2026-09-03')).toBeNull();
    });
  });

  // 6. Timezone UTC+7
  describe('6. Timezone UTC+7 Consistency', () => {
    it('evaluates dayType correctly without local midnight timezone shift', () => {
      expect(getVietnamDayType('2024-05-04')).toBe('SATURDAY');
      expect(getVietnamDayType('2025-04-26')).toBe('SATURDAY');
      expect(getVietnamDayType('2026-10-18')).toBe('SUNDAY');
      expect(getVietnamDayType('2026-10-19')).toBe('WEEKDAY');
    });
  });

  // 7. Validation & Parameter Filtering
  describe('7. API Query & Input Validation', () => {
    it('filters accurately by date range', () => {
      const holidays = service.getHolidays({ from: '2026-04-20', to: '2026-05-05' });
      const names = holidays.map((h: HolidayDto) => h.name);
      expect(names).toContain('Giỗ Tổ Hùng Vương');
      expect(names).toContain('Giải Phóng Miền Nam');
      expect(names).toContain('Quốc Tế Lao Động');
      expect(names).not.toContain('Quốc Khánh');
      expect(names).not.toContain('Tết Dương Lịch');
    });

    it('throws BadRequestException on invalid range from > to', () => {
      expect(() => {
        service.getHolidays({ from: '2026-12-31', to: '2026-01-01' });
      }).toThrow(BadRequestException);
    });

    it('throws BadRequestException on malformed date string', () => {
      expect(() => {
        service.getHolidays({ from: 'invalid-date' });
      }).toThrow(BadRequestException);
    });

    it('throws BadRequestException on out-of-range year', () => {
      expect(() => {
        service.getHolidays({ year: 1850 });
      }).toThrow(BadRequestException);
    });
  });
});
