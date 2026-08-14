import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('districts')
export class DistrictsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':cityCode')
  async getDistricts(@Param('cityCode') cityCode: string) {
    return this.prisma.districts.findMany({
      where: { parent_code: cityCode },
    });
  }
}