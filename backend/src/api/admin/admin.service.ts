import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionService } from '../transaction/transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private transactions: TransactionService,
    private readonly mailService: MailService,
  ) {}

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

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const chartStart = new Date(monthStart);
    chartStart.setMonth(chartStart.getMonth() - 5);

    const [
      successCount,
      paidRevenue,
      outstandingRevenue,
      paidInvoices,
      pendingInvoices,
      paidThisMonth,
      recentPaidInvoices,
    ] = await Promise.all([
      this.prisma.transaction.count({ where: { status: 'SUCCESS' } }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: ['DRAFT', 'PENDING_PAYMENT', 'OVERDUE'] } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.count({ where: { status: 'PAID' } }),
      this.prisma.invoice.count({
        where: { status: { in: ['DRAFT', 'PENDING_PAYMENT', 'OVERDUE'] } },
      }),
      this.prisma.invoice.aggregate({
        where: { status: 'PAID', paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: 'PAID', paidAt: { gte: chartStart } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const monthlyRevenue = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(chartStart.getFullYear(), chartStart.getMonth() + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: `T${date.getMonth() + 1}`,
        amount: 0,
      };
    });
    for (const invoice of recentPaidInvoices) {
      if (!invoice.paidAt) continue;
      const key = `${invoice.paidAt.getFullYear()}-${invoice.paidAt.getMonth()}`;
      const bucket = monthlyRevenue.find((item) => item.key === key);
      if (bucket) bucket.amount += Number(invoice.amount);
    }

    return {
      totalUsers,
      pendingPosts,
      activePosts,
      successfulTransactions: successCount,
      totalRevenue: Number(paidRevenue._sum.amount || 0),
      projectedRevenue: Number(totalRevenue),
      outstandingRevenue: Number(outstandingRevenue._sum.amount || 0),
      revenueThisMonth: Number(paidThisMonth._sum.amount || 0),
      paidInvoices,
      pendingInvoices,
      monthlyRevenue: monthlyRevenue.map(({ label, amount }) => ({ label, amount })),
    };
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
      },
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
      },
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
      },
    });

    if (data.isLocked !== undefined) {
      if (data.isLocked === true) {
        await this.prisma.posts.updateMany({
          where: { userId: id },
          data: { status: 'HIDDEN' },
        });
      } else {
        await this.prisma.posts.updateMany({
          where: { userId: id },
          data: { status: 'ACTIVE' },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  // Duyệt hoặc Từ chối bài đăng
  async reviewPost(postId: number, status: 'ACTIVE' | 'HIDDEN', reason?: string) {
    if (!['ACTIVE', 'HIDDEN'].includes(status))
      throw new BadRequestException('Trạng thái duyệt không hợp lệ.');
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM posts WHERE id = ${postId} FOR UPDATE`;
      const post = await db.posts.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Không tìm thấy bài đăng.');
      if (post.status === status) return post;
      if (post.status !== 'PENDING')
        throw new BadRequestException('Chỉ xử lý tin đang chờ duyệt.');
      if (status === 'HIDDEN' && !reason?.trim())
        throw new BadRequestException('Vui lòng nhập lý do từ chối.');
      const updated = await db.posts.update({
        where: { id: postId },
        data: { status, approvedAt: status === 'ACTIVE' ? new Date() : null },
      });
      if (post.userId) {
        const event = `post:${postId}:review:${post.updatedAt.getTime()}`;
        await db.notification.upsert({
          where: { eventKey: `${event}:${post.userId}` },
          update: {},
          create: {
            userId: post.userId,
            eventKey: `${event}:${post.userId}`,
            type: 'POST_UPDATE',
            link: '/dashboard',
            title: status === 'ACTIVE' ? 'Bài đăng đã được duyệt' : 'Bài đăng bị từ chối',
            content:
              status === 'ACTIVE'
                ? `Bài “${post.title}” đã được duyệt và hiển thị.`
                : `Bài “${post.title}” bị từ chối: ${reason?.trim()}`,
          },
        });
        if (status === 'ACTIVE') {
          const followers = await db.follow.findMany({
            where: { followingId: post.userId, followerId: { not: post.userId } },
          });
          await db.notification.createMany({
            data: followers.map((item) => ({
              userId: item.followerId,
              eventKey: `${event}:follower:${item.followerId}`,
              type: 'POST_UPDATE' as const,
              title: 'Người bạn theo dõi vừa đăng tin mới',
              content: `Bài “${post.title}” vừa được duyệt.`,
              link: `/posts/${postId}`,
            })),
            skipDuplicates: true,
          });
        }
      }
      return updated;
    });
  }

  // --- QUẢN LÝ GIAO DỊCH (ĐỐI SOÁT CHÉO) ---
  async getAllTransactions() {
    return this.prisma.transaction.findMany({
      include: {
        invoice: true,
        buyer: { select: { fullName: true, email: true, phoneNumber: true } },
        seller: { select: { fullName: true, email: true, phoneNumber: true } },
        post: {
          select: {
            title: true,
            price: true,
            transactionType: true,
            posterType: true,
            brokerCommission: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🌟 HÀM XỬ LÝ TRANH CHẤP / ĐỐI SOÁT GIAO DỊCH CHO ADMIN (CHUẨN XÁC)
  async resolveTransactionDispute(
    id: string,
    resolutionStatus: 'SUCCESS' | 'CANCELLED',
    finalFee?: number,
  ) {
    if (finalFee !== undefined)
      throw new BadRequestException(
        'Phí đã được chốt khi khách hàng xác nhận, không sửa qua API đối soát.',
      );
    return this.transactions.resolveDispute(id, resolutionStatus);
  }

  // --- QUẢN LÝ LIÊN HỆ & TRỢ GIÚP ---
  async getAllContacts() {
    return this.prisma.contact.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateContactStatus(id: number, status: string) {
    return this.prisma.contact.update({
      where: { id },
      data: { status },
    });
  }

  async replyContactEmail(
    contactId: number,
    emailTo: string,
    subject: string,
    message: string,
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true },
    });
    if (!contact) throw new NotFoundException('Không tìm thấy liên hệ.');
    if (contact.email.trim().toLowerCase() !== emailTo.trim().toLowerCase()) {
      throw new BadRequestException('Email không khớp với liên hệ cần phản hồi.');
    }

    await this.mailService.sendContactReply(contact.email, subject, message);

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { status: 'REPLIED' },
    });
  }

  async deleteContact(id: number) {
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  // --- QUẢN LÝ BÁO CÁO VI PHẠM ---
  async getAllReports() {
    return this.prisma.report.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        post: { select: { title: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReportStatus(id: number, status: string) {
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
  }

  async deletePostByAdmin(postId: number, reportId: number) {
    await this.prisma.posts
      .delete({
        where: { id: postId },
      })
      .catch(() => {});

    return this.prisma.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
    });
  }

  async deleteReport(id: number) {
    return this.prisma.report.delete({
      where: { id },
    });
  }
}
