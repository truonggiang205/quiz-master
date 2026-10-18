import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { HolidaysService } from '../services/holidays.service.js';
import { createSuccessResponse } from '../../../common/dto/api-response.dto.js';

@ApiTags('Calendar & Holidays')
@Controller('calendar')
export class CalendarController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get('holidays')
  @ApiOperation({
    summary: 'Lấy danh sách các ngày lễ Việt Nam (cố định và lịch âm/nghỉ lễ từng năm)',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Từ ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', required: false, description: 'Đến ngày (YYYY-MM-DD)' })
  @ApiQuery({ name: 'year', required: false, description: 'Năm cần truy vấn (VD: 2026)' })
  getHolidays(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('year') year?: string,
  ) {
    const data = this.holidaysService.getHolidays({
      from,
      to,
      year: year ? parseInt(year, 10) : undefined,
    });
    return createSuccessResponse(data, 'Lấy danh sách ngày lễ thành công');
  }
}
