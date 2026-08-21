import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { SubmitContactDto, SubmitReportDto } from './dto/app.dto';

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
  async submitContact(data: SubmitContactDto) {
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
  async submitReport(data: SubmitReportDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        'Tài khoản báo cáo không tồn tại hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      );
    }

    if (data.postId !== undefined) {
      const post = await this.prisma.posts.findUnique({
        where: { id: data.postId },
        select: { id: true },
      });

      if (!post) {
        throw new BadRequestException('Bài đăng cần báo cáo không tồn tại.');
      }
    }

    return this.prisma.report.create({
      data: {
        userId: data.userId,
        postId: data.postId ?? null,
        reason: data.reason,
        status: 'PENDING',
      }
    });
  }
}