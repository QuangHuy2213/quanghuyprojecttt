import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto, UpdatePostDto } from './dto/posts.dto';

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
    area?: string,
    transactionType?: 'SALE' | 'RENT' | 'PROJECT',
  ) {
    const skip = (page - 1) * limit;

    // 🌟 ĐÃ SỬA: Chỉ lấy các bài viết đã được Admin duyệt (ACTIVE)
    const whereClause: any = { status: 'ACTIVE' };

    // 1. Lọc theo khu vực
    if (city) whereClause.city = city;
    if (district) whereClause.district = district;
    if (transactionType) whereClause.transactionType = transactionType;

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
            select: { fullName: true, role: true, phoneNumber: true },
          },
          // 🌟 KÈM THEO SỐ LƯỢNG TIM BAN ĐẦU
          _count: {
            select: { favorites: true },
          },
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

  async findOnePost(id: number, viewerId?: string, role?: string) {
    const post = await this.prisma.posts.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Không tìm thấy tin đăng.');
    if (post.status !== 'ACTIVE' && viewerId !== post.userId && role !== 'ADMIN') {
      const participant =
        viewerId &&
        (await this.prisma.transaction.findFirst({
          where: {
            postId: id,
            buyerId: viewerId,
            status: {
              in: ['NEGOTIATING', 'SALE_PENDING', 'SUCCESS', 'DISPUTE', 'PENDING_CANCEL'],
            },
          },
        }));
      if (!participant) throw new NotFoundException('Tin hiện không còn hiển thị.');
    }
    return this.prisma.posts.findUnique({
      where: { id },
      include: {
        cities: true,
        districts: true,
        user: {
          select: { id: true, fullName: true, phoneNumber: true, role: true },
        },
        images: true,
        // 🌟 KÈM THEO SỐ LƯỢNG TIM TRONG TRANG CHI TIẾT
        _count: {
          select: { favorites: true },
        },
      },
    });
  }

  async getComments(postId: number) {
    return this.prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { likes: true } },
        replies: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            _count: { select: { likes: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createComment(
    postId: number,
    userId: string,
    content: string,
    parentId?: number,
  ) {
    const cleanContent = content?.trim();
    if (!cleanContent)
      throw new BadRequestException('Nội dung bình luận không được để trống.');
    if (cleanContent.length > 1000)
      throw new BadRequestException('Bình luận tối đa 1000 ký tự.');
    if (parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: parentId, postId },
      });
      if (!parent) throw new BadRequestException('Bình luận gốc không tồn tại.');
    }
    return this.prisma.comment.create({
      data: { postId, userId, content: cleanContent, parentId: parentId || null },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
        _count: { select: { likes: true } },
      },
    });
  }

  async toggleCommentLike(commentId: number, userId: string) {
    const where = { userId_commentId: { userId, commentId } };
    const found = await this.prisma.commentLike.findUnique({ where });
    if (found) {
      await this.prisma.commentLike.delete({ where });
    } else {
      await this.prisma.commentLike.create({ data: { userId, commentId } });
    }
    return {
      liked: !found,
      count: await this.prisma.commentLike.count({ where: { commentId } }),
    };
  }

  async createPost(data: CreatePostDto) {
    await this.validateLocation(data.city, data.district);

    if (data.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, role: true, isLocked: true, agentExpiresAt: true },
      });

      if (!user) {
        throw new BadRequestException(
          'Người dùng không tồn tại hoặc phiên đăng nhập đã hết hạn.',
        );
      }
    }

    if (data.userId) {
      const account = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { role: true, isLocked: true, agentExpiresAt: true },
      });
      if (account?.isLocked) {
        throw new BadRequestException('Tài khoản đang bị khóa và không thể đăng tin.');
      }
      const hasPostingAccess =
        account?.role === 'ADMIN' ||
        (account?.role === 'AGENT' &&
          (!account.agentExpiresAt || account.agentExpiresAt > new Date()));
      if (!hasPostingAccess) {
        throw new BadRequestException('Bạn cần nâng cấp tài khoản để đăng tin.');
      }
    }

    return this.prisma.posts.create({
      data: {
        title: data.title,
        price: data.price,
        area: data.area,
        city: data.city,
        district: data.district,
        content: data.content,
        thumbnail: data.thumbnail,
        userId: data.userId ? String(data.userId) : null,
        transactionType: data.transactionType || 'SALE',
        posterType: data.posterType || 'OWNER',
        brokerCommission: data.brokerCommission ?? null,
        images: data.images?.length
          ? { create: data.images.map((url) => ({ url })) }
          : undefined,

        // 🌟 THÊM MỚI: Bắt buộc bài đăng mới phải ở trạng thái PENDING chờ duyệt
        status: 'PENDING',

        // 🌟 LƯU TÊN NGƯỜI BÁN KHI TỰ ĐĂNG TIN MỚI
        sellerName: data.sellerName || null,
        addressDetail: data.addressDetail || null,
        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
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
              select: { fullName: true, role: true },
            },
            _count: {
              select: { favorites: true },
            },
          },
        },
      },
    });

    // Bóc tách dữ liệu: Chỉ lấy phần thông tin bài viết (post) để Frontend dễ dùng
    return favorites.map((fav) => fav.post);
  }

  // LẤY DANH SÁCH BÀI VIẾT DO USER ĐÃ ĐĂNG
  async findPostsByUser(userId: string, viewerId: string) {
    if (userId !== viewerId)
      throw new ForbiddenException('Chỉ chủ tài khoản được xem danh sách quản lý tin.');
    return this.prisma.posts.findMany({
      where: { userId: userId },
      orderBy: { id: 'desc' },
      include: {
        transactions: {
          where: {
            status: {
              in: ['NEGOTIATING', 'SALE_PENDING', 'SUCCESS', 'DISPUTE', 'PENDING_CANCEL'],
            },
          },
          select: {
            id: true,
            status: true,
            buyer: { select: { fullName: true, phoneNumber: true } },
          },
          take: 1,
        },
        cities: true,
        districts: true,
        // 🌟 Lấy cả thông tin user và số lượng tim cho trang quản lý tin
        user: {
          select: { fullName: true, role: true },
        },
        _count: {
          select: { favorites: true },
        },
      },
    });
  }

  // XÓA BÀI VIẾT (Có kiểm tra bảo mật)
  async deletePost(id: number, userId: string) {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM posts WHERE id = ${id} FOR UPDATE`;
      const post = await db.posts.findUnique({ where: { id } });
      if (!post || post.userId !== userId)
        throw new BadRequestException('Bạn không có quyền xóa tin này.');
      if (
        post.status === 'SOLD' ||
        (await db.transaction.findFirst({ where: { postId: id } }))
      )
        throw new BadRequestException(
          'Tin có lịch sử giao dịch không thể xóa; hãy ẩn hoặc hủy thỏa thuận.',
        );
      return db.posts.delete({ where: { id } });
    });
  }

  async updatePost(id: number, userId: string, data: UpdatePostDto) {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM posts WHERE id = ${id} FOR UPDATE`;
      const post = await db.posts.findUnique({ where: { id } });
      if (!post || post.userId !== userId)
        throw new BadRequestException('Bạn không có quyền sửa tin này.');
      const reserved = await db.transaction.findFirst({
        where: {
          postId: id,
          status: {
            in: ['NEGOTIATING', 'SALE_PENDING', 'SUCCESS', 'DISPUTE', 'PENDING_CANCEL'],
          },
        },
      });
      if (post.status === 'SOLD' || reserved)
        throw new BadRequestException(
          'Tin đang thỏa thuận hoặc đã giao dịch. Hãy xử lý trong lịch sử giao dịch.',
        );
      if (data.status === 'SOLD')
        throw new BadRequestException('Phải báo đã bán và nhận xác nhận của khách hàng.');
      if (data.status === 'ACTIVE' && !post.approvedAt)
        throw new BadRequestException('Tin cần được admin duyệt trước khi hiển thị.');
      if (data.city !== undefined || data.district !== undefined)
        await this.validateLocation(
          data.city ?? post.city ?? undefined,
          data.district ?? post.district ?? undefined,
        );
      const { userId: ignoredUserId, images, status, ...details } = data;
      const edited =
        Object.keys(details).some((key) => details[key] !== undefined) ||
        images !== undefined;
      return db.posts.update({
        where: { id },
        data: {
          ...details,
          ...(edited
            ? { status: 'PENDING', approvedAt: null }
            : status
              ? { status }
              : {}),
          ...(images
            ? { images: { deleteMany: {}, create: images.map((url) => ({ url })) } }
            : {}),
        },
      });
    });
  }

  private async validateLocation(cityCode?: string, districtCode?: string) {
    if (!cityCode || !districtCode) {
      throw new BadRequestException('Vui lòng chọn tỉnh/thành phố và quận/huyện hợp lệ.');
    }

    const [city, district] = await Promise.all([
      this.prisma.cities.findUnique({
        where: { code: cityCode },
        select: { code: true },
      }),
      this.prisma.districts.findUnique({
        where: { code: districtCode },
        select: { code: true, parent_code: true },
      }),
    ]);

    if (!city) {
      throw new BadRequestException(
        'Tỉnh/thành phố không tồn tại. Hãy chọn mã từ API /cities.',
      );
    }

    if (!district || district.parent_code !== city.code) {
      throw new BadRequestException(
        'Quận/huyện không tồn tại hoặc không thuộc tỉnh/thành phố đã chọn.',
      );
    }
  }
}
