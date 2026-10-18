import { describe, it, expect, beforeEach } from 'vitest';
import { HolidaysService } from '../services/holidays.service.js';
import type { HolidayDto } from '../dto/holiday.dto.js';
import { BadRequestException } from '@nestjs/common';

describe('HolidaysService (Production-Grade Vietnam Holiday System)', () => {
  let service: HolidaysService;

  beforeEach(() => {
    service = new HolidaysService();
  });

  describe('Official Schedules (2024 - 2028)', () => {
    it.each([2024, 2025, 2026, 2027, 2028])('should load official holiday schedule for year %i', (year: number) => {
      const holidays = service.getHolidays({ year });
      expect(holidays.length).toBeGreaterThan(0);

      // Check official Tet
      const tet = holidays.find((h: HolidayDto) => h.name.includes('Tết Nguyên Đán'));
      expect(tet).toBeDefined();
      expect(tet?.source).toBe('OFFICIAL');
      expect(tet?.isOfficialSchedule).toBe(true);
      expect(tet?.type).toBe('PUBLIC_HOLIDAY');

      // Check official Hung Vuong
      const hungVuong = holidays.find((h: HolidayDto) => h.name.includes('Giỗ Tổ Hùng Vương'));
      expect(hungVuong).toBeDefined();
      expect(hungVuong?.source).toBe('OFFICIAL');
      expect(hungVuong?.isOfficialSchedule).toBe(true);
      expect(hungVuong?.type).toBe('PUBLIC_HOLIDAY');
    });

    it('should distinguish multi-day break for Tet 2026', () => {
      const tet2026 = service.getHolidayForDate('2026-02-18');
      expect(tet2026).toBeDefined();
      expect(tet2026?.name).toContain('Tết Nguyên Đán');
      expect(tet2026?.type).toBe('PUBLIC_HOLIDAY');
      expect(tet2026?.source).toBe('OFFICIAL');
    });
  });

  describe('Future Unconfigured Years (e.g. 2029, 2030, 2035)', () => {
    it('should calculate Lunar holidays using astronomical UTC+7 utility with LUNAR_CALCULATED source', () => {
      const holidays2030 = service.getHolidays({ year: 2030 });
      expect(holidays2030.length).toBeGreaterThan(0);

      // Tet 2030
      const tet2030 = holidays2030.find((h: HolidayDto) => h.name === 'Tết Nguyên Đán');
      expect(tet2030).toBeDefined();
      expect(tet2030?.date).toBe('2030-02-02');
      expect(tet2030?.source).toBe('LUNAR_CALCULATED');
      expect(tet2030?.isOfficialSchedule).toBe(false);
      expect(tet2030?.type).toBe('LUNAR_HOLIDAY');

      // Giỗ Tổ 2030 (10/3 âm)
      const hungVuong2030 = holidays2030.find((h: HolidayDto) => h.name === 'Giỗ Tổ Hùng Vương');
      expect(hungVuong2030).toBeDefined();
      expect(hungVuong2030?.date).toBe('2030-04-12');
      expect(hungVuong2030?.source).toBe('LUNAR_CALCULATED');
      expect(hungVuong2030?.isOfficialSchedule).toBe(false);
      expect(hungVuong2030?.type).toBe('LUNAR_HOLIDAY');
    });
  });

  describe('Distinction between Public Holiday and Special Day', () => {
    it('should mark 30/4 and 1/5 as PUBLIC_HOLIDAY', () => {
      const gph = service.getHolidayForDate('2026-04-30');
      expect(gph?.type).toBe('PUBLIC_HOLIDAY');
      expect(gph?.isOfficialSchedule).toBe(true);

      const ld = service.getHolidayForDate('2026-05-01');
      expect(ld?.type).toBe('PUBLIC_HOLIDAY');
      expect(ld?.isOfficialSchedule).toBe(true);

      expect(service.isPublicHoliday('2026-04-30')).toBe(true);
      expect(service.isPublicHoliday('2026-05-01')).toBe(true);
    });

    it('should mark 20/11 (Nhà Giáo Việt Nam) as SPECIAL_DAY (not public holiday)', () => {
      const teachersDay = service.getHolidayForDate('2026-11-20');
      expect(teachersDay).toBeDefined();
      expect(teachersDay?.name).toBe('Nhà Giáo Việt Nam');
      expect(teachersDay?.type).toBe('SPECIAL_DAY');
      expect(teachersDay?.isOfficialSchedule).toBe(false);

      // Must NOT be treated as public holiday
      expect(service.isPublicHoliday('2026-11-20')).toBe(false);
    });

    it('should mark 20/10 and 8/3 as SPECIAL_DAY', () => {
      const pnvn = service.getHolidayForDate('2026-10-20');
      expect(pnvn?.type).toBe('SPECIAL_DAY');
      expect(pnvn?.isOfficialSchedule).toBe(false);
      expect(service.isPublicHoliday('2026-10-20')).toBe(false);

      const qtpn = service.getHolidayForDate('2026-03-08');
      expect(qtpn?.type).toBe('SPECIAL_DAY');
      expect(qtpn?.isOfficialSchedule).toBe(false);
      expect(service.isPublicHoliday('2026-03-08')).toBe(false);
    });
  });

  describe('Range Query & Validation', () => {
    it('should filter correctly by date range', () => {
      const holidays = service.getHolidays({ from: '2026-04-20', to: '2026-05-05' });
      const names = holidays.map((h: HolidayDto) => h.name);
      expect(names).toContain('Giỗ Tổ Hùng Vương');
      expect(names).toContain('Giải Phóng Miền Nam');
      expect(names).toContain('Quốc Tế Lao Động');
      expect(names).not.toContain('Quốc Khánh');
      expect(names).not.toContain('Tết Dương Lịch');
    });

    it('should throw BadRequestException if from > to', () => {
      expect(() => {
        service.getHolidays({ from: '2026-12-31', to: '2026-01-01' });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException on malformed date string', () => {
      expect(() => {
        service.getHolidays({ from: 'invalid-date' });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException on out-of-range year', () => {
      expect(() => {
        service.getHolidays({ year: 1850 });
      }).toThrow(BadRequestException);
    });
  });
});
