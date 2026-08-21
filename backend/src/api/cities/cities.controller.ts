import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Locations')
@Controller('cities') // Đổi 'api/cities' thành 'cities' cho đường dẫn ngắn gọn
export class CitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tỉnh, thành phố' })
  async getCities() {
    return this.prisma.cities.findMany();
  }
}