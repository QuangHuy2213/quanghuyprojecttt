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
  // 🌟 THÊM HÀM LƯU LIÊN HỆ
  async submitContact(data: any) {
    return this.prisma.contact.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        subject: data.subject,
        message: data.message,
      }
    });
  }
  // 🌟 THÊM HÀM LƯU BÁO CÁO VI PHẠM
  async submitReport(data: any) {
    return this.prisma.report.create({
      data: {
        userId: data.userId,                 // Người gửi báo cáo
        postId: data.postId ? Number(data.postId) : null, // ID bài viết bị báo cáo (nếu có)
        reason: data.reason,                 // Lý do báo cáo
        status: 'PENDING',                   // Trạng thái mặc định là Chờ xử lý
      }
    });
  }
}