import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt'; 
import * as nodemailer from 'nodemailer';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    
    // Tính tổng doanh thu từ các giao dịch THÀNH CÔNG
    const successfulTransactions = await this.prisma.transaction.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { calculatedFee: true },
    });
    const totalRevenue = successfulTransactions._sum.calculatedFee || 0;
    
    return { totalUsers, pendingPosts, activePosts, totalRevenue };
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
        isLocked: true, 
        lockReason: true, 
        agentExpiresAt: true, 
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
        isLocked: false,
      }
    });
  }

  async updateUserDetails(id: string, data: any) {
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        role: data.role,
        isLocked: data.isLocked,
        lockReason: data.lockReason,
      }
    });

    if (data.isLocked !== undefined) {
      if (data.isLocked === true) {
        await this.prisma.posts.updateMany({
          where: { userId: id },
          data: { status: 'HIDDEN' }
        });
      } else {
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
    const updatedPost = await this.prisma.posts.update({
      where: { id: postId },
      data: { status },
    });

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

  // --- QUẢN LÝ GIAO DỊCH (ĐỐI SOÁT CHÉO) ---
  async getAllTransactions() {
    return this.prisma.transaction.findMany({
      include: {
        buyer: { select: { fullName: true, email: true, phoneNumber: true } },
        seller: { select: { fullName: true, email: true, phoneNumber: true } },
        post: { select: { title: true, price: true, transactionType: true, posterType: true, brokerCommission: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // 🌟 HÀM XỬ LÝ TRANH CHẤP / ĐỐI SOÁT GIAO DỊCH CHO ADMIN (CHUẨN XÁC)
  async resolveTransactionDispute(id: string, resolutionStatus: 'SUCCESS' | 'CANCELLED', finalFee?: number) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { post: true }
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch!');
    }

    let feeToUpdate = finalFee;

    // Nếu duyệt thành công mà chưa truyền finalFee thủ công, hệ thống tự động tính theo công thức chuẩn
    if (resolutionStatus === 'SUCCESS' && !feeToUpdate) {
      const posterType = transaction.post?.posterType as 'OWNER' | 'BROKER';
      const transactionType = transaction.post?.transactionType as 'SALE' | 'RENT';
      const price = Number(transaction.post?.price || 0);
      const brokerCommission = transaction.post?.brokerCommission || 0;

      if (posterType === 'OWNER') {
        feeToUpdate = transactionType === 'SALE' ? price * 0.015 : price * 0.10;
      } else {
        const brokerMoney = transactionType === 'SALE' ? price * (brokerCommission / 100) : price;
        feeToUpdate = brokerMoney * 0.20;
      }
    }

    // Cập nhật trạng thái giao dịch
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        status: resolutionStatus,
        calculatedFee: resolutionStatus === 'SUCCESS' ? (feeToUpdate || 0) : 0
      }
    });

    // Nếu thành công thì đồng thời đổi trạng thái bài đăng thành SOLD
    if (resolutionStatus === 'SUCCESS') {
      await this.prisma.posts.update({
        where: { id: transaction.postId },
        data: { status: 'SOLD' }
      });
      await this.prisma.invoice.upsert({
        where: { transactionId: id },
        create: { transactionId: id, userId: transaction.sellerId, amount: feeToUpdate || 0, status: 'DRAFT' },
        update: { amount: feeToUpdate || 0 },
      });
    } else {
      await this.prisma.posts.update({ where: { id: transaction.postId }, data: { status: 'ACTIVE' } });
      await this.prisma.invoice.updateMany({ where: { transactionId: id }, data: { status: 'CANCELLED' } });
    }

    return { success: true, data: updated };
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

  async deleteContact(id: number) {
    return this.prisma.contact.delete({
      where: { id }
    });
  }

  // --- QUẢN LÝ BÁO CÁO VI PHẠM ---
  async getAllReports() {
    return this.prisma.report.findMany({
      include: {
        user: { select: { fullName: true, email: true } }, 
        post: { select: { title: true, id: true } }        
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

  async deletePostByAdmin(postId: number, reportId: number) {
    await this.prisma.posts.delete({
      where: { id: postId }
    }).catch(() => {});

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
