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

  @Get('posts')
  getPosts(
    @Query('city') city?: string,
    @Query('district') district?: string,
  ) {
    return this.appService.getPosts(city, district);
  }
}