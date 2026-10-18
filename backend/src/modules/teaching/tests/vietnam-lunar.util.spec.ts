import { describe, it, expect } from 'vitest';
import {
  getTetNguyenDanSolarDate,
  getGioToHungVuongSolarDate,
  convertLunar2Solar,
  convertSolar2Lunar,
} from '../utils/vietnam-lunar.util.js';

describe('Vietnam Lunar Calendar Astronomical Utility (UTC+7)', () => {
  it('should calculate Mùng 1 Tết Nguyên Đán for 2024 - 2030 correctly according to Vietnam UTC+7', () => {
    expect(getTetNguyenDanSolarDate(2024)).toBe('2024-02-10');
    expect(getTetNguyenDanSolarDate(2025)).toBe('2025-01-29');
    expect(getTetNguyenDanSolarDate(2026)).toBe('2026-02-17');
    expect(getTetNguyenDanSolarDate(2027)).toBe('2027-02-06');
    expect(getTetNguyenDanSolarDate(2028)).toBe('2028-01-26');
    expect(getTetNguyenDanSolarDate(2029)).toBe('2029-02-13');
    expect(getTetNguyenDanSolarDate(2030)).toBe('2030-02-02'); // Note: 23:08 on Feb 2 in UTC+7 (Hanoi) vs Feb 3 in UTC+8 (Beijing)
  });

  it('should calculate Giỗ Tổ Hùng Vương (10/3 Âm lịch) for 2024 - 2030 correctly according to Vietnam UTC+7', () => {
    expect(getGioToHungVuongSolarDate(2024)).toBe('2024-04-18');
    expect(getGioToHungVuongSolarDate(2025)).toBe('2025-04-07');
    expect(getGioToHungVuongSolarDate(2026)).toBe('2026-04-26');
    expect(getGioToHungVuongSolarDate(2027)).toBe('2027-04-16');
    expect(getGioToHungVuongSolarDate(2028)).toBe('2028-04-04');
    expect(getGioToHungVuongSolarDate(2029)).toBe('2029-04-23');
    expect(getGioToHungVuongSolarDate(2030)).toBe('2030-04-12');
  });

  it('should round-trip convert between Solar and Lunar accurately', () => {
    // 2026-02-17 is Lunar 2026-01-01 (Mùng 1 Tết Bính Ngọ)
    const [lunarDay, lunarMonth, lunarYear, isLeap] = convertSolar2Lunar(17, 2, 2026, 7.0);
    expect(lunarDay).toBe(1);
    expect(lunarMonth).toBe(1);
    expect(lunarYear).toBe(2026);
    expect(isLeap).toBe(0);

    const [solarDay, solarMonth, solarYear] = convertLunar2Solar(lunarDay, lunarMonth, lunarYear, isLeap, 7.0);
    expect(solarDay).toBe(17);
    expect(solarMonth).toBe(2);
    expect(solarYear).toBe(2026);
  });

  it('should calculate future years 2035 and 2050 without throwing errors', () => {
    const tet2035 = getTetNguyenDanSolarDate(2035);
    const hungVuong2035 = getGioToHungVuongSolarDate(2035);
    expect(tet2035).toMatch(/^2035-/);
    expect(hungVuong2035).toMatch(/^2035-/);

    const tet2050 = getTetNguyenDanSolarDate(2050);
    const hungVuong2050 = getGioToHungVuongSolarDate(2050);
    expect(tet2050).toMatch(/^2050-/);
    expect(hungVuong2050).toMatch(/^2050-/);
  });
});
