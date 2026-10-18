import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type OccasionType = 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'NONE';
export type DayType = 'WEEKDAY' | 'SATURDAY' | 'SUNDAY';
export type WorkStatus = 'WORKING_DAY' | 'REST_DAY' | 'MAKEUP_WORKING_DAY';
export type HolidaySource = 'OFFICIAL' | 'FIXED' | 'LUNAR_CALCULATED';
export type HolidayScope = 'GENERAL' | 'GOVERNMENT' | 'EMPLOYEE' | 'SCHOOL';

// Backward compatibility type alias
export type HolidayType = 'PUBLIC_HOLIDAY' | 'SPECIAL_DAY' | 'MAKEUP_WORKING_DAY' | 'LUNAR_HOLIDAY';

export class HolidayDto {
  @ApiProperty({ description: 'ID định danh của ngày lễ / sự kiện / ngày làm bù' })
  id: string;

  @ApiProperty({ description: 'Tên ngày lễ (VD: Tết Nguyên Đán, Quốc Khánh, Ngày Nhà giáo VN)' })
  name: string;

  @ApiProperty({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc nếu là đợt nghỉ nhiều ngày (YYYY-MM-DD)' })
  endDate?: string;

  @ApiProperty({
    description: 'Sự kiện / Dịp lễ (A. OCCASION)',
    enum: ['PUBLIC_HOLIDAY', 'SPECIAL_DAY', 'NONE'],
  })
  occasion: OccasionType;

  @ApiProperty({
    description: 'Phân loại ngày trong tuần (B. DAY TYPE)',
    enum: ['WEEKDAY', 'SATURDAY', 'SUNDAY'],
  })
  dayType: DayType;

  @ApiProperty({
    description: 'Trạng thái làm việc (C. WORK STATUS)',
    enum: ['WORKING_DAY', 'REST_DAY', 'MAKEUP_WORKING_DAY'],
  })
  workStatus: WorkStatus;

  @ApiProperty({
    description: 'Phạm vi áp dụng đối tượng',
    enum: ['GENERAL', 'GOVERNMENT', 'EMPLOYEE', 'SCHOOL'],
    default: 'GENERAL',
  })
  scope: HolidayScope;

  @ApiProperty({
    description: 'Nguồn dữ liệu của ngày lễ',
    enum: ['OFFICIAL', 'FIXED', 'LUNAR_CALCULATED'],
  })
  source: HolidaySource;

  @ApiProperty({
    description: 'Xác định đây có phải lịch nghỉ chính thức của Chính phủ/Bộ luật Lao động hay không',
  })
  isOfficialSchedule: boolean;

  @ApiPropertyOptional({ description: 'Năm áp dụng' })
  year?: number;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  description?: string;

  @ApiPropertyOptional({ description: 'Danh sách các ngày nghỉ cụ thể trong đợt (YYYY-MM-DD)' })
  restDates?: string[];

  @ApiPropertyOptional({ description: 'Danh sách các ngày làm bù cụ thể (YYYY-MM-DD)' })
  makeupWorkingDates?: string[];

  @ApiPropertyOptional({
    description: 'Trường tương thích ngược',
    enum: ['PUBLIC_HOLIDAY', 'SPECIAL_DAY', 'MAKEUP_WORKING_DAY', 'LUNAR_HOLIDAY'],
  })
  type?: HolidayType;

  @ApiPropertyOptional({ description: 'Ngày lễ có lặp lại hàng năm hay không' })
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt' })
  isActive?: boolean;
}

export class QueryHolidaysDto {
  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)' })
  from?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)' })
  to?: string;

  @ApiPropertyOptional({ description: 'Năm cần truy vấn (VD: 2026)' })
  year?: number;
}
