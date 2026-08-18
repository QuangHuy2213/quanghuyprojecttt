import { Controller, Get, Param, Query } from '@nestjs/common';
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
}