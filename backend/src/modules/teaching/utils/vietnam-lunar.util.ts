/**
 * Production-grade Vietnamese Lunar Calendar astronomical converter.
 * Canonical implementation based on Dr. Ho Ngoc Duc's Meeus (1998) algorithms
 * strictly calibrated for Vietnam standard timezone UTC+7 (Asia/Ho_Chi_Minh).
 *
 * Source: http://www.informatik.uni-leipzig.de/~duc/amlich/
 * Valid range: 1800 - 2199.
 * 100% offline, zero runtime third-party dependency.
 */

const PI = Math.PI;

/**
 * Compute the number of days since 1 January 4713 BC (Julian day number).
 */
export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

/**
 * Convert Julian day number to Gregorian Date [day, month, year].
 */
export function jdToDate(jd: number): [number, number, number] {
  let a: number;
  let b: number;
  let c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return [day, month, year];
}

/**
 * Solar longitude in degrees (Jean Meeus 1998).
 */
function sunLongitudeAA98(jdn: number): number {
  const julianTime = (jdn - 2451545.0) / 36525; // Time in Julian centuries from 2000-01-01 12:00:00 GMT
  const squareJulianTime = julianTime * julianTime;
  const dr = PI / 180;
  const meanAnomaly =
    357.5291 + 35999.0503 * julianTime - 0.0001559 * squareJulianTime - 0.00000048 * julianTime * squareJulianTime;
  const meanLongitude = 280.46645 + 36000.76983 * julianTime + 0.0003032 * squareJulianTime;
  let dl =
    (1.9146 - 0.004817 * julianTime - 0.000014 * squareJulianTime) * Math.sin(dr * meanAnomaly) +
    (0.019993 - 0.000101 * julianTime) * Math.sin(dr * 2 * meanAnomaly) +
    0.00029 * Math.sin(dr * 3 * meanAnomaly);
  let trueLongitude = meanLongitude + dl;
  trueLongitude -= 360 * Math.floor(trueLongitude / 360);
  return trueLongitude;
}

/**
 * Julian day number of the kth new moon since 1900-01-01 13:51 GMT (Jean Meeus 1998).
 */
function newMoonAA98(k: number): number {
  const julianTime = k / 1236.85; // Time in Julian centuries from 1900 January 0.5
  const squareJulianTime = julianTime * julianTime;
  const cubicJulianTime = squareJulianTime * julianTime;
  const dr = PI / 180;
  let jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * squareJulianTime -
    0.000000155 * cubicJulianTime +
    0.00033 * Math.sin((166.56 + 132.87 * julianTime - 0.009173 * squareJulianTime) * dr);

  const sunMeanAnomaly = 359.2242 + 29.10535608 * k - 0.0000333 * squareJulianTime - 0.00000347 * cubicJulianTime;
  const moonMeanAnomaly =
    306.0253 + 385.81691806 * k + 0.0107306 * squareJulianTime + 0.00001236 * cubicJulianTime;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * squareJulianTime - 0.00000239 * cubicJulianTime;

  let c1 =
    (0.1734 - 0.000393 * julianTime) * Math.sin(sunMeanAnomaly * dr) +
    0.0021 * Math.sin(2 * dr * sunMeanAnomaly) -
    0.4068 * Math.sin(moonMeanAnomaly * dr) +
    0.0161 * Math.sin(dr * 2 * moonMeanAnomaly) -
    0.0004 * Math.sin(dr * 3 * moonMeanAnomaly) +
    0.0104 * Math.sin(dr * 2 * f) -
    0.0051 * Math.sin(dr * (sunMeanAnomaly + moonMeanAnomaly)) -
    0.0074 * Math.sin(dr * (sunMeanAnomaly - moonMeanAnomaly)) +
    0.0004 * Math.sin(dr * (2 * f + sunMeanAnomaly)) -
    0.0004 * Math.sin(dr * (2 * f - sunMeanAnomaly)) -
    0.0006 * Math.sin(dr * (2 * f + moonMeanAnomaly)) +
    0.001 * Math.sin(dr * (2 * f - moonMeanAnomaly)) +
    0.0005 * Math.sin(dr * (2 * moonMeanAnomaly + sunMeanAnomaly));

  let deltAt: number;
  if (julianTime < -11) {
    deltAt =
      0.001 +
      0.000839 * julianTime +
      0.0002261 * squareJulianTime -
      0.00000845 * cubicJulianTime -
      0.000000081 * julianTime * cubicJulianTime;
  } else {
    deltAt = -0.000278 + 0.000265 * julianTime + 0.000262 * squareJulianTime;
  }
  return jd1 + c1 - deltAt;
}

function getSunLongitude(dayNumber: number, timeZone = 7.0): number {
  return sunLongitudeAA98(dayNumber - 0.5 - timeZone / 24);
}

function getNewMoonDay(k: number, timeZone = 7.0): number {
  const jd = newMoonAA98(k);
  return Math.floor(jd + 0.5 + timeZone / 24);
}

function getLunarMonth11(yy: number, timeZone = 7.0): number {
  const off = jdFromDate(31, 12, yy) - 2415021.076998695;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = Math.floor(getSunLongitude(nm, timeZone) / 30);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone = 7.0): number {
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let last: number;
  let i = 1;
  let arc = Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
  do {
    last = arc;
    i++;
    arc = Math.floor(getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone) / 30);
  } while (arc !== last && i < 14);
  return i - 1;
}

/**
 * Convert a Vietnamese Lunar date to Gregorian [day, month, year].
 * @param lunarDay 1-30
 * @param lunarMonth 1-12
 * @param lunarYear e.g. 2026
 * @param lunarLeap 0 for normal, 1 for leap month
 * @param timeZone default 7.0 (UTC+7 / Asia/Ho_Chi_Minh)
 */
export function convertLunar2Solar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = 0,
  timeZone = 7.0,
): [number, number, number] {
  let a11: number;
  let b11: number;

  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }

  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }

  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap !== 0 && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap !== 0 || off >= leapOff) {
      off += 1;
    }
  }

  const monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunarDay - 1);
}

/**
 * Convert a Gregorian date to Vietnamese Lunar date [lunarDay, lunarMonth, lunarYear, isLeap].
 */
export function convertSolar2Lunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = 7.0,
): [number, number, number, number] {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;

  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = 1;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

/**
 * Format result to standard YYYY-MM-DD string.
 */
export function formatSolarDate(day: number, month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Helper to get Mùng 1 Tết Âm Lịch (Lunar 1/1) for a given Gregorian year.
 */
export function getTetNguyenDanSolarDate(lunarYear: number): string {
  const [d, m, y] = convertLunar2Solar(1, 1, lunarYear, 0, 7.0);
  return formatSolarDate(d, m, y);
}

/**
 * Helper to get Giỗ Tổ Hùng Vương (Lunar 10/3) for a given Gregorian year.
 */
export function getGioToHungVuongSolarDate(lunarYear: number): string {
  const [d, m, y] = convertLunar2Solar(10, 3, lunarYear, 0, 7.0);
  return formatSolarDate(d, m, y);
}
