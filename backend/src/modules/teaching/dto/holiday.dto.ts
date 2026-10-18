import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type HolidayType = 'PUBLIC_HOLIDAY' | 'OBSERVANCE' | 'TRADITIONAL';

export class HolidayDto {
  @ApiProperty({ description: 'ID định danh của ngày lễ' })
  id: string;

  @ApiProperty({ description: 'Tên ngày lễ (VD: Tết Nguyên Đán, Quốc Khánh)' })
  name: string;

  @ApiProperty({ description: 'Ngày bắt đầu (YYYY-MM-DD)' })
  date: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc nếu là đợt nghỉ nhiều ngày (YYYY-MM-DD)' })
  endDate?: string;

  @ApiProperty({
    description: 'Phân loại ngày lễ',
    enum: ['PUBLIC_HOLIDAY', 'OBSERVANCE', 'TRADITIONAL'],
  })
  type: HolidayType;

  @ApiPropertyOptional({ description: 'Mô tả chi tiết' })
  description?: string;

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
