import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getPosts(
    @Query('city') city?: string,
    @Query('district') district?: string,
  ) {
    const filter: any = {};
    
    // Nếu có truyền param lên thì mới lọc, không thì lấy hết
    if (city) filter.city = city;
    if (district) filter.district = district;

    return this.prisma.posts.findMany({
      where: filter,
    });
  }
}