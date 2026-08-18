import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

 async findAllPosts(
    page: number = 1, 
    limit: number = 8, 
    city?: string, 
    district?: string, 
    keyword?: string, 
    price?: string, 
    area?: string
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = { status: { not: 'HIDDEN' } };

    // 1. Lọc theo khu vực
    if (city) whereClause.city = city;
    if (district) whereClause.district = district;

    // 2. Lọc theo từ khóa tiêu đề
    if (keyword) {
      whereClause.title = { contains: keyword, mode: 'insensitive' };
    }
    
    // 3. Lọc theo mức giá
    if (price === 'under-1b') {
      whereClause.price = { lt: 1000000000 };
    } else if (price === '1b-3b') {
      whereClause.price = { gte: 1000000000, lte: 3000000000 };
    } else if (price === '3b-5b') {
      whereClause.price = { gte: 3000000000, lte: 5000000000 };
    } else if (price === 'over-5b') {
      whereClause.price = { gt: 5000000000 };
    }

    // 4. Lọc theo diện tích
    if (area === 'under-30') {
      whereClause.area = { lt: 30 };
    } else if (area === '30-50') {
      whereClause.area = { gte: 30, lte: 50 };
    } else if (area === '50-80') {
      whereClause.area = { gte: 50, lte: 80 };
    } else if (area === 'over-80') {
      whereClause.area = { gt: 80 };
    }

    const [data, total] = await Promise.all([
      this.prisma.posts.findMany({
        skip,
        take: limit,
        where: whereClause,
        orderBy: { id: 'desc' },
        include: { cities: true, districts: true },
      }),
      this.prisma.posts.count({ where: whereClause }),
    ]);

    return {
      data,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOnePost(id: number) {
    return this.prisma.posts.findUnique({
      where: { id },
      include: {
        cities: true,
        districts: true,
        user: {
          select: { fullName: true, phoneNumber: true, role: true }
        }
      }
    });
  }

  async createPost(data: any) {
    return this.prisma.posts.create({
      data: {
        title: data.title,
        price: Number(data.price),
        area: Number(data.area),
        city: data.city,
        district: data.district,
        content: data.content,
        thumbnail: data.thumbnail,
        userId: data.userId ? String(data.userId) : null,
      },
    });
  }
  // HÀM XỬ LÝ LƯU TIN / BỎ LƯU TIN (THẢ TIM)
  async toggleFavorite(userId: string, postId: number) {
    // 1. Kiểm tra xem user này đã lưu bài viết này chưa (Dựa vào index unique bạn đã tạo)
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId,
        },
      },
    });

    if (existingFavorite) {
      // 2. Nếu đã lưu rồi -> Xóa đi (Bỏ thả tim)
      await this.prisma.favorite.delete({
        where: { id: existingFavorite.id },
      });
      return { message: 'Đã bỏ lưu tin', isFavorited: false };
    } else {
      // 3. Nếu chưa lưu -> Thêm vào bảng Favorite (Thả tim)
      await this.prisma.favorite.create({
        data: {
          userId: userId,
          postId: postId,
        },
      });
      return { message: 'Đã lưu tin thành công', isFavorited: true };
    }
  }
  // HÀM LẤY DANH SÁCH BÀI VIẾT ĐÃ THẢ TIM CỦA 1 USER
  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: userId },
      orderBy: { id: 'desc' }, // Lấy tin mới lưu lên đầu
      include: {
        post: {
          include: {
            cities: true,
            districts: true,
          }
        }
      }
    });
    
    // Bóc tách dữ liệu: Chỉ lấy phần thông tin bài viết (post) để Frontend dễ dùng
    return favorites.map(fav => fav.post);
  }
  // LẤY DANH SÁCH BÀI VIẾT DO USER ĐÃ ĐĂNG
  async findPostsByUser(userId: string) {
    return this.prisma.posts.findMany({
      where: { userId: userId },
      orderBy: { id: 'desc' },
      include: {
        cities: true,
        districts: true,
      },
    });
  }

  // XÓA BÀI VIẾT (Có kiểm tra bảo mật)
  async deletePost(id: number, userId: string) {
    // 1. Tìm xem bài viết có tồn tại và có đúng là của user này không
    const post = await this.prisma.posts.findUnique({
      where: { id },
    });

    if (!post) throw new Error('Không tìm thấy bài viết');
    if (post.userId !== userId) throw new Error('Bạn không có quyền xóa bài viết này!');

    // 2. Tiến hành xóa
    return this.prisma.posts.delete({
      where: { id },
    });
  }
  async updatePost(id: number, userId: string, data: any) {
    // 1. Kiểm tra quyền sở hữu
    const post = await this.prisma.posts.findUnique({ where: { id } });
    if (!post) throw new Error('Bài viết không tồn tại');
    if (post.userId !== userId) throw new Error('Bạn không có quyền chỉnh sửa bài này!');

    // 2. Tự động gom những dữ liệu người dùng muốn cập nhật
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.area !== undefined) updateData.area = Number(data.area);
    if (data.content !== undefined) updateData.content = data.content;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.status !== undefined) updateData.status = data.status; // Thêm cho phép cập nhật trạng thái

    // 3. Tiến hành cập nhật
    return this.prisma.posts.update({
      where: { id },
      data: updateData,
    });
  }
}