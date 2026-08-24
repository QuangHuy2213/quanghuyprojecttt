import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt'; 
import * as nodemailer from 'nodemailer';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // --- 🌟 CẤU HÌNH MAIL CỦA ADMIN 🌟 ---
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'quanghuy22130504@gmail.com', 
      pass: 'mqlbonvnmwhmgdab', 
    },
  });

  // --- LOGIC DASHBOARD ---
  async getDashboardStats() {
    const totalUsers = await this.prisma.user.count();
    const pendingPosts = await this.prisma.posts.count({ where: { status: 'PENDING' } });
    const activePosts = await this.prisma.posts.count({ where: { status: 'ACTIVE' } });
    
    return { totalUsers, pendingPosts, activePosts };
  }

  // --- LOGIC LẤY & ĐỔI QUYỀN USER ---
  async getAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        isLocked: true, // 🌟 THÊM DÒNG NÀY ĐỂ TRẢ VỀ TRẠNG THÁI KHÓA
      }
    });
  }

  async updateUserRole(id: string, role: 'USER' | 'AGENT' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  // --- LOGIC THÊM / SỬA / XÓA ---
  async createUser(data: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email này đã tồn tại!');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = data.password ? await bcrypt.hash(data.password, salt) : null;

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        role: data.role || 'USER',
        isLocked: false, // Mặc định khi tạo mới là không khóa
      }
    });
  }

  async updateUserDetails(id: string, data: any) {
    // 1. Cập nhật thông tin và trạng thái khóa của User
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        role: data.role,
        isLocked: data.isLocked,
      }
    });

    // 2. 🌟 XỬ LÝ TRẠNG THÁI BÀI VIẾT DỰA TRÊN TRẠNG THÁI KHÓA 🌟
    if (data.isLocked !== undefined) {
      if (data.isLocked === true) {
        // Nếu bị khóa -> Ẩn tất cả bài viết
        await this.prisma.posts.updateMany({
          where: { userId: id },
          data: { status: 'HIDDEN' }
        });
      } else {
        // Nếu mở khóa -> Khôi phục bài viết về trạng thái ACTIVE (hoặc PENDING tùy ý bạn)
        await this.prisma.posts.updateMany({
          where: { userId: id },
          data: { status: 'ACTIVE' }
        });
      }
    }

    return updatedUser;
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // Lấy danh sách bài đăng chờ duyệt
  async getPendingPosts() {
    return this.prisma.posts.findMany({
      where: { status: 'PENDING' },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Duyệt hoặc Từ chối bài đăng
  async reviewPost(postId: number, status: 'ACTIVE' | 'HIDDEN', reason?: string) {
    // Cập nhật trạng thái bài đăng
    const updatedPost = await this.prisma.posts.update({
      where: { id: postId },
      data: { status },
    });

    // Tạo thông báo cho người đăng bài
    const title = status === 'ACTIVE' ? 'Bài đăng đã được duyệt' : 'Bài đăng bị từ chối';
    const content = status === 'ACTIVE' 
      ? `Chúc mừng! Bài đăng "${updatedPost.title}" của bạn đã được duyệt và hiển thị.`
      : `Rất tiếc, bài đăng "${updatedPost.title}" của bạn bị từ chối. Lý do: ${reason}`;

    await this.prisma.notification.create({
      data: {
        userId: updatedPost.userId || '',
        title,
        content,
        type: 'POST_UPDATE'
      }
    });

    return updatedPost;
  }

  // --- QUẢN LÝ LIÊN HỆ & TRỢ GIÚP ---
  async getAllContacts() {
    return this.prisma.contact.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateContactStatus(id: number, status: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { status }
    });
  }

  // --- 🌟 HÀM GỬI EMAIL TỪ ADMIN 🌟 ---
  async replyContactEmail(contactId: number, emailTo: string, subject: string, message: string) {
    await this.transporter.sendMail({
      from: '"Nhà Tốt Support" <quanghuy22130504@gmail.com>',
      to: emailTo,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1877F2;">Phản hồi từ Nhà Tốt</h2>
          <div style="font-size: 15px; line-height: 1.6;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
          <p style="margin-top: 30px; font-size: 13px; color: #777; border-top: 1px solid #eee; padding-top: 15px;">
            Đội ngũ hỗ trợ Nhà Tốt.<br/>
            Hotline: 1900 6868
          </p>
        </div>
      `,
    });

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { status: 'REPLIED' }
    });
  }

  // --- QUẢN LÝ BÁO CÁO VI PHẠM ---
  async getAllReports() {
    return this.prisma.report.findMany({
      include: {
        user: { select: { fullName: true, email: true } }, // Lấy tên người báo cáo
        post: { select: { title: true, id: true } }        // Lấy tên bài bị báo cáo
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateReportStatus(id: number, status: string) {
    return this.prisma.report.update({
      where: { id },
      data: { status }
    });
  }

  async deleteContact(id: number) {
    return this.prisma.contact.delete({
      where: { id }
    });
  }

  // 🌟 THÊM HÀM XÓA BÀI VIẾT DÀNH CHO ADMIN
  async deletePostByAdmin(postId: number, reportId: number) {
    // 1. Xóa bài viết trong bảng Posts
    await this.prisma.posts.delete({
      where: { id: postId }
    }).catch(() => {
      // Đề phòng trường hợp bài viết đã bị xóa từ trước rồi
    });

    // 2. Cập nhật trạng thái báo cáo thành ĐÃ XỬ LÝ (RESOLVED)
    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' }
    });
  }

  async deleteReport(id: number) {
    return this.prisma.report.delete({
      where: { id }
    });
  }
}