import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Locations')
@Controller('districts')
export class DistrictsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':cityCode')
  @ApiOperation({ summary: 'Lấy danh sách quận, huyện theo tỉnh thành' })
  @ApiParam({ name: 'cityCode', example: '79' })
  async getDistricts(@Param('cityCode') cityCode: string) {
    return this.prisma.districts.findMany({
      where: { parent_code: cityCode },
    });
  }
}