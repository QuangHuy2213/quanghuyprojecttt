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
    
    // 🌟 ĐÃ SỬA: Chỉ lấy các bài viết đã được Admin duyệt (ACTIVE)
    const whereClause: any = { status: 'ACTIVE' }; 

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
        include: { 
          cities: true, 
          districts: true,
          // 🌟 KÉO THÔNG TIN TÊN NGƯỜI ĐĂNG RA TRANG CHỦ
          user: {
            select: { fullName: true, role: true, phoneNumber: true }
          },
          // 🌟 KÈM THEO SỐ LƯỢNG TIM BAN ĐẦU
          _count: {
            select: { favorites: true }
          }
        },
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
        },
        // 🌟 KÈM THEO SỐ LƯỢNG TIM TRONG TRANG CHI TIẾT
        _count: {
          select: { favorites: true }
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
        
        // 🌟 THÊM MỚI: Bắt buộc bài đăng mới phải ở trạng thái PENDING chờ duyệt
        status: 'PENDING',

        // 🌟 LƯU TÊN NGƯỜI BÁN KHI TỰ ĐĂNG TIN MỚI
        sellerName: data.sellerName || null,
        addressDetail: data.addressDetail || null,
        bedrooms: data.bedrooms ? Number(data.bedrooms) : null,
        bathrooms: data.bathrooms ? Number(data.bathrooms) : null,
      },
    });
  }

  // HÀM XỬ LÝ LƯU TIN / BỎ LƯU TIN (THẢ TIM)
  async toggleFavorite(userId: string, postId: number) {
    // 1. Kiểm tra xem user này đã lưu bài viết này chưa
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
      
      // Đếm lại tổng số tim sau khi giảm
      const totalFavorites = await this.prisma.favorite.count({ where: { postId } });
      
      return { message: 'Đã bỏ lưu tin', isFavorited: false, totalFavorites };
    } else {
      // 3. Nếu chưa lưu -> Thêm vào bảng Favorite (Thả tim)
      await this.prisma.favorite.create({
        data: {
          userId: userId,
          postId: postId,
        },
      });
      
      // Đếm lại tổng số tim sau khi tăng
      const totalFavorites = await this.prisma.favorite.count({ where: { postId } });
      
      return { message: 'Đã lưu tin thành công', isFavorited: true, totalFavorites };
    }
  }

  // HÀM LẤY DANH SÁCH BÀI VIẾT ĐÃ THẢ TIM CỦA 1 USER
  async getUserFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: userId },
      orderBy: { id: 'desc' },
      include: {
        post: {
          include: {
            cities: true,
            districts: true,
            // 🌟 Lấy cả thông tin user và số lượng tim cho trang yêu thích
            user: {
              select: { fullName: true, role: true }
            },
            _count: {
              select: { favorites: true }
            }
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
        // 🌟 Lấy cả thông tin user và số lượng tim cho trang quản lý tin
        user: {
            select: { fullName: true, role: true }
        },
        _count: {
          select: { favorites: true }
        }
      },
    });
  }

  // XÓA BÀI VIẾT (Có kiểm tra bảo mật)
  async deletePost(id: number, userId: string) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
    });

    if (!post) throw new Error('Không tìm thấy bài viết');
    if (post.userId !== userId) throw new Error('Bạn không có quyền xóa bài viết này!');

    return this.prisma.posts.delete({
      where: { id },
    });
  }

  // CẬP NHẬT BÀI VIẾT
  async updatePost(id: number, userId: string, data: any) {
    // 1. Kiểm tra quyền sở hữu
    const post = await this.prisma.posts.findUnique({ where: { id } });
    if (!post) throw new Error('Bài viết không tồn tại');
    if (post.userId !== userId) throw new Error('Bạn không có quyền chỉnh sửa bài này!');

    // 2. Gom tất cả dữ liệu người dùng muốn cập nhật
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.area !== undefined) updateData.area = Number(data.area);
    if (data.content !== undefined) updateData.content = data.content;
    if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
    if (data.status !== undefined) updateData.status = data.status; 
    if (data.sellerName !== undefined) updateData.sellerName = data.sellerName;
    
    if (data.city !== undefined) updateData.city = data.city;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.addressDetail !== undefined) updateData.addressDetail = data.addressDetail;
    if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms ? Number(data.bedrooms) : null;
    if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms ? Number(data.bathrooms) : null;

    // 3. Tiến hành cập nhật
    return this.prisma.posts.update({
      where: { id },
      data: updateData,
    });
  }
}