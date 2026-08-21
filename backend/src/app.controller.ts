import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

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
  async submitContact(@Body() body: any) {
    return this.appService.submitContact(body);
  }
  @Post('reports')
  async submitReport(@Body() body: any) {
    return this.appService.submitReport(body);
  }
}