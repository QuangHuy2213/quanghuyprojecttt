import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('cities') // Đổi 'api/cities' thành 'cities' cho đường dẫn ngắn gọn
export class CitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getCities() {
    return this.prisma.cities.findMany();
  }
}