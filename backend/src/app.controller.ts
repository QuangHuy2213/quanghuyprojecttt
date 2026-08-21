import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { SubmitContactDto, SubmitReportDto } from './dto/app.dto';

@ApiTags('General')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('cities')
  getCities() {
    return this.appService.getCities();
  }

  @Get('districts/:cityCode')
  getDistricts(@Param('cityCode') cityCode: string) {
    return this.appService.getDistricts(cityCode);
  }
  
  // MỞ API POST /contacts ĐỂ FRONTEND GỌI
  @Post('contacts')
  @ApiOperation({ summary: 'Gửi yêu cầu liên hệ và hỗ trợ' })
  @ApiBody({ type: SubmitContactDto })
  async submitContact(@Body() body: SubmitContactDto) {
    return this.appService.submitContact(body);
  }
  @Post('reports')
  @ApiOperation({ summary: 'Gửi báo cáo vi phạm' })
  @ApiBody({ type: SubmitReportDto })
  async submitReport(@Body() body: SubmitReportDto) {
    return this.appService.submitReport(body);
  }
}