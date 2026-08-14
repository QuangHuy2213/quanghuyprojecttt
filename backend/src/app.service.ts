import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  // 1. Lấy toàn bộ danh sách Tỉnh/Thành
  async getCities() {
    return this.prisma.cities.findMany();
  }

  // 2. Lấy Quận/Huyện dựa theo mã Tỉnh/Thành
  async getDistricts(cityCode: string) {
    return this.prisma.districts.findMany({
      where: { parent_code: cityCode },
    });
  }

  // 3. Lấy Bài viết (có hỗ trợ bộ lọc)
  async getPosts(cityCode?: string, districtCode?: string) {
    const filter: any = {};
    if (cityCode) filter.city = cityCode;
    if (districtCode) filter.district = districtCode;

    return this.prisma.posts.findMany({
      where: filter,
    });
  }
}