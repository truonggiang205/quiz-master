import { describe, it, expect, beforeEach } from 'vitest';
import { HolidaysService, getVietnamDayType } from '../services/holidays.service.js';
import type { HolidayDto } from '../dto/holiday.dto.js';
import { BadRequestException } from '@nestjs/common';

describe('HolidaysService (Production-Grade Vietnam Holiday & Calendar System)', () => {
  let service: HolidaysService;

  beforeEach(() => {
    service = new HolidaysService();
  });

  // Test 1: Tết Dương lịch
  it('1. should classify Tết Dương Lịch as PUBLIC_HOLIDAY and REST_DAY', () => {
    const h = service.getHolidayForDate('2026-01-01');
    expect(h).toBeDefined();
    expect(h?.name).toContain('Tết Dương Lịch');
    expect(h?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(h?.workStatus).toBe('REST_DAY');
    expect(h?.isOfficialSchedule).toBe(true);
    expect(service.isPublicHoliday('2026-01-01')).toBe(true);
  });

  // Test 2: Tết Nguyên Đán
  it('2. should classify Tết Nguyên Đán as PUBLIC_HOLIDAY and REST_DAY', () => {
    // Official year 2025
    const tet2025 = service.getHolidayForDate('2025-01-28');
    expect(tet2025).toBeDefined();
    expect(tet2025?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(tet2025?.workStatus).toBe('REST_DAY');
    expect(tet2025?.source).toBe('OFFICIAL');
    expect(tet2025?.isOfficialSchedule).toBe(true);

    // Calculated year 2030
    const tet2030 = service.getHolidayForDate('2030-02-02');
    expect(tet2030).toBeDefined();
    expect(tet2030?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(tet2030?.workStatus).toBe('REST_DAY');
    expect(tet2030?.source).toBe('LUNAR_CALCULATED');
    expect(tet2030?.isOfficialSchedule).toBe(false);
  });

  // Test 3: Giỗ Tổ Hùng Vương (MUST BE PUBLIC_HOLIDAY, NOT LUNAR_HOLIDAY!)
  it('3. should classify Giỗ Tổ Hùng Vương strictly as PUBLIC_HOLIDAY (Article 112)', () => {
    // Official year 2024 (18/04/2024)
    const hv2024 = service.getHolidayForDate('2024-04-18');
    expect(hv2024).toBeDefined();
    expect(hv2024?.name).toContain('Giỗ Tổ Hùng Vương');
    expect(hv2024?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(hv2024?.workStatus).toBe('REST_DAY');
    expect(service.isPublicHoliday('2024-04-18')).toBe(true);

    // Calculated year 2030 (12/04/2030)
    const hv2030 = service.getHolidayForDate('2030-04-12');
    expect(hv2030).toBeDefined();
    expect(hv2030?.name).toContain('Giỗ Tổ Hùng Vương');
    expect(hv2030?.occasion).toBe('PUBLIC_HOLIDAY'); // MUST NOT be 'LUNAR_HOLIDAY'
    expect(hv2030?.workStatus).toBe('REST_DAY');
    expect(hv2030?.source).toBe('LUNAR_CALCULATED');
    expect(hv2030?.isOfficialSchedule).toBe(false);
    expect(service.isPublicHoliday('2030-04-12')).toBe(true);
  });

  // Test 4: 30/4 Giải Phóng Miền Nam
  it('4. should classify 30/4 as PUBLIC_HOLIDAY and REST_DAY', () => {
    const h = service.getHolidayForDate('2026-04-30');
    expect(h?.name).toContain('Giải Phóng Miền Nam');
    expect(h?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(h?.workStatus).toBe('REST_DAY');
    expect(h?.isOfficialSchedule).toBe(true);
    expect(service.isPublicHoliday('2026-04-30')).toBe(true);
  });

  // Test 5: 1/5 Quốc Tế Lao Động
  it('5. should classify 1/5 as PUBLIC_HOLIDAY and REST_DAY', () => {
    const h = service.getHolidayForDate('2026-05-01');
    expect(h?.name).toContain('Quốc Tế Lao Động');
    expect(h?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(h?.workStatus).toBe('REST_DAY');
    expect(h?.isOfficialSchedule).toBe(true);
    expect(service.isPublicHoliday('2026-05-01')).toBe(true);
  });

  // Test 6: Quốc khánh (2/9 mandatory; contiguous day per official decree, not hardcoded for future)
  it('6. should not hardcode 02/09 - 03/09 for all years and handle official contiguous days', () => {
    // Official year 2025: contiguous day is 01/09, NOT 03/09!
    const qk2025LiềnKề = service.getHolidayForDate('2025-09-01');
    expect(qk2025LiềnKề).toBeDefined();
    expect(qk2025LiềnKề?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(qk2025LiềnKề?.workStatus).toBe('REST_DAY');

    const qk2025Chính = service.getHolidayForDate('2025-09-02');
    expect(qk2025Chính?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(qk2025Chính?.workStatus).toBe('REST_DAY');

    // 03/09/2025 is NOT a holiday in 2025!
    const qk2025KhongCo = service.getHolidayForDate('2025-09-03');
    expect(qk2025KhongCo).toBeNull();

    // Future calculated year 2026: 02/09 is mandatory, 03/09 is NOT hardcoded
    const qk2026 = service.getHolidayForDate('2026-09-02');
    expect(qk2026?.occasion).toBe('PUBLIC_HOLIDAY');
    expect(qk2026?.workStatus).toBe('REST_DAY');

    const dayAfter2026 = service.getHolidayForDate('2026-09-03');
    expect(dayAfter2026).toBeNull(); // Not hardcoded as holiday for future years
  });

  // Test 7: Special Day (8/3, 20/10, 20/11)
  it('7. should classify special observance days as SPECIAL_DAY and WORKING_DAY', () => {
    // 20/11 Nhà Giáo VN
    const teachersDay = service.getHolidayForDate('2026-11-20');
    expect(teachersDay).toBeDefined();
    expect(teachersDay?.occasion).toBe('SPECIAL_DAY');
    expect(teachersDay?.workStatus).toBe('WORKING_DAY');
    expect(teachersDay?.isOfficialSchedule).toBe(false);
    expect(service.isPublicHoliday('2026-11-20')).toBe(false);

    // 08/03 Quốc Tế Phụ Nữ
    const womensDay = service.getHolidayForDate('2026-03-08');
    expect(womensDay?.occasion).toBe('SPECIAL_DAY');
    expect(womensDay?.workStatus).toBe('WORKING_DAY');
    expect(service.isPublicHoliday('2026-03-08')).toBe(false);

    // 20/10 Phụ Nữ Việt Nam
    const vnWomensDay = service.getHolidayForDate('2026-10-20');
    expect(vnWomensDay?.occasion).toBe('SPECIAL_DAY');
    expect(vnWomensDay?.workStatus).toBe('WORKING_DAY');
    expect(service.isPublicHoliday('2026-10-20')).toBe(false);
  });

  // Test 8: Saturday
  it('8. should correctly identify SATURDAY in dayType', () => {
    expect(getVietnamDayType('2024-05-04')).toBe('SATURDAY');
    expect(getVietnamDayType('2025-04-26')).toBe('SATURDAY');
    expect(getVietnamDayType('2026-10-17')).toBe('SATURDAY');
  });

  // Test 9: Sunday
  it('9. should correctly identify SUNDAY in dayType', () => {
    expect(getVietnamDayType('2025-04-27')).toBe('SUNDAY');
    expect(getVietnamDayType('2026-10-18')).toBe('SUNDAY');
  });

  // Test 10: Makeup Working Day
  it('10. should identify MAKEUP_WORKING_DAY with occasion NONE and workStatus MAKEUP_WORKING_DAY', () => {
    // 04/05/2024 is Saturday makeup work for 30/4 swap
    const makeup2024 = service.getHolidayForDate('2024-05-04');
    expect(makeup2024).toBeDefined();
    expect(makeup2024?.name).toContain('Làm việc bù');
    expect(makeup2024?.occasion).toBe('NONE');
    expect(makeup2024?.workStatus).toBe('MAKEUP_WORKING_DAY');
    expect(makeup2024?.dayType).toBe('SATURDAY');
    expect(service.isMakeupWorkingDay('2024-05-04')).toBe(true);

    // 26/04/2025 is Saturday makeup work for 30/4 swap
    const makeup2025 = service.getHolidayForDate('2025-04-26');
    expect(makeup2025).toBeDefined();
    expect(makeup2025?.occasion).toBe('NONE');
    expect(makeup2025?.workStatus).toBe('MAKEUP_WORKING_DAY');
    expect(makeup2025?.dayType).toBe('SATURDAY');
    expect(service.isMakeupWorkingDay('2025-04-26')).toBe(true);
  });

  // Test 11: Official schedule override calculated date
  it('11. should prioritize OFFICIAL > FIXED > LUNAR_CALCULATED when official schedule exists', () => {
    const holidays2024 = service.getHolidays({ year: 2024 });
    const tet2024 = holidays2024.find((h: HolidayDto) => h.name.includes('Tết Nguyên Đán'));
    expect(tet2024?.source).toBe('OFFICIAL');
    expect(tet2024?.isOfficialSchedule).toBe(true);
    expect(tet2024?.endDate).toBe('2024-02-14');
  });

  // Test 12: from / to filtering
  it('12. should filter accurately by from and to range', () => {
    const holidays = service.getHolidays({ from: '2026-04-20', to: '2026-05-05' });
    const names = holidays.map((h: HolidayDto) => h.name);
    expect(names).toContain('Giỗ Tổ Hùng Vương');
    expect(names).toContain('Giải Phóng Miền Nam');
    expect(names).toContain('Quốc Tế Lao Động');
    expect(names).not.toContain('Quốc Khánh');
    expect(names).not.toContain('Tết Dương Lịch');
  });

  // Test 13: Timezone UTC+7
  it('13. should handle dates consistently in Vietnam UTC+7 timezone', () => {
    // Leap month / solar-lunar conversion in UTC+7
    const tet2028 = service.getHolidays({ year: 2028 }).find((h) => h.name.includes('Tết Nguyên Đán'));
    expect(tet2028?.date).toBe('2028-01-26');
    expect(tet2028?.occasion).toBe('PUBLIC_HOLIDAY');
  });

  // Test 14: Year without official schedule (2026, 2030)
  it('14. should mark isOfficialSchedule = false and wording "astronomically calculated" for years without decree', () => {
    const holidays2030 = service.getHolidays({ year: 2030 });
    const tet2030 = holidays2030.find((h: HolidayDto) => h.name === 'Tết Nguyên Đán');
    expect(tet2030?.source).toBe('LUNAR_CALCULATED');
    expect(tet2030?.isOfficialSchedule).toBe(false);
    expect(tet2030?.description).toContain('thuật toán thiên văn UTC+7');
    expect(tet2030?.description).not.toContain('chính xác tuyệt đối');
  });

  // Test 15: Year with official schedule (2024, 2025)
  it('15. should mark isOfficialSchedule = true and source = OFFICIAL for confirmed decrees (2024, 2025)', () => {
    const holidays2025 = service.getHolidays({ year: 2025 });
    const officialItems = holidays2025.filter((h) => h.source === 'OFFICIAL');
    expect(officialItems.length).toBeGreaterThan(0);
    for (const item of officialItems) {
      expect(item.isOfficialSchedule).toBe(true);
      expect(item.source).toBe('OFFICIAL');
    }
  });

  // Parameter validation tests
  describe('Input Validation', () => {
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
