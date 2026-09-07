import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, EscrowStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const OPEN: EscrowStatus[] = [
  'VERIFYING',
  'NEGOTIATING',
  'SALE_PENDING',
  'DISPUTE',
  'PENDING_CANCEL',
];
const RESERVED: EscrowStatus[] = [
  'NEGOTIATING',
  'SALE_PENDING',
  'SUCCESS',
  'DISPUTE',
  'PENDING_CANCEL',
];

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  private locked<T>(
    postId: number,
    action: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM posts WHERE id = ${postId} FOR UPDATE`;
      return action(db);
    });
  }

  private async mutate<T>(
    id: string,
    action: (db: Prisma.TransactionClient) => Promise<T>,
  ) {
    const current = await this.prisma.transaction.findUnique({
      where: { id },
      select: { postId: true },
    });
    if (!current) throw new NotFoundException('Không tìm thấy giao dịch.');
    return this.locked(current.postId, action);
  }

  private requireParticipant(
    transaction: { buyerId: string; sellerId: string },
    userId: string,
  ) {
    if (![transaction.buyerId, transaction.sellerId].includes(userId))
      throw new ForbiddenException('Bạn không tham gia giao dịch này.');
  }

  private async notify(
    db: Prisma.TransactionClient,
    users: string[],
    key: string,
    title: string,
    content: string,
    link = '/my-transactions',
  ) {
    for (const userId of new Set(users)) {
      await db.notification.upsert({
        where: { eventKey: `${key}:${userId}` },
        update: {},
        create: {
          userId,
          eventKey: `${key}:${userId}`,
          title,
          content,
          type: 'SYSTEM',
          link,
        },
      });
    }
  }

  private async notifyAdmins(
    db: Prisma.TransactionClient,
    key: string,
    title: string,
    content: string,
  ) {
    const admins = await db.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await this.notify(
      db,
      admins.map((user) => user.id),
      key,
      title,
      content,
      '/admin/transactions',
    );
  }

  calculateAppFee(
    posterType: 'OWNER' | 'BROKER',
    transactionType: 'SALE' | 'RENT' | 'PROJECT',
    price: number,
    brokerCommission = 0,
  ) {
    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(brokerCommission) ||
      brokerCommission < 0
    )
      throw new BadRequestException('Giá trị tính phí không hợp lệ.');
    if (transactionType === 'PROJECT') return 0;
    if (posterType === 'OWNER')
      return Math.round(price * (transactionType === 'SALE' ? 0.015 : 0.1));
    return Math.round(
      transactionType === 'SALE' ? ((price * brokerCommission) / 100) * 0.2 : price * 0.2,
    );
  }

  async triggerEscrowVerification(postId: number, buyerId: string, sellerId: string) {
    return this.locked(postId, async (db) => {
      const post = await db.posts.findUnique({ where: { id: postId } });
      if (
        !post ||
        post.userId !== sellerId ||
        sellerId === buyerId ||
        post.status !== 'ACTIVE'
      )
        return null;
      const existing = await db.transaction.findFirst({
        where: { postId, buyerId, sellerId, status: { in: OPEN } },
      });
      if (existing) return existing;
      if (await db.transaction.findFirst({ where: { postId, status: { in: RESERVED } } }))
        return null;
      if (
        await db.transaction.findFirst({
          where: {
            postId,
            buyerId,
            sellerId,
            status: 'CANCELLED',
            updatedAt: { gte: new Date(Date.now() - 30 * 60_000) },
          },
        })
      )
        return null;
      const transaction = await db.transaction.create({
        data: { postId, buyerId, sellerId, status: 'VERIFYING' },
      });
      await this.notify(
        db,
        [buyerId, sellerId],
        `${transaction.id}:proposal`,
        'Bạn có đang trong quá trình thỏa thuận?',
        `Cuộc trò chuyện về “${post.title}” có dấu hiệu thỏa thuận. Mỗi bên vui lòng xác nhận. Đây chưa phải xác nhận đã bán.`,
      );
      return transaction;
    });
  }

  async markPostSold(postId: number, sellerId: string, buyerPhone: string) {
    const phone = typeof buyerPhone === 'string' ? buyerPhone.replace(/\s+/g, '') : '';
    if (!/^0\d{9}$/.test(phone))
      throw new BadRequestException(
        'Số điện thoại khách hàng phải gồm 10 số, bắt đầu bằng 0.',
      );
    return this.locked(postId, async (db) => {
      const post = await db.posts.findUnique({ where: { id: postId } });
      if (!post) throw new NotFoundException('Không tìm thấy bài đăng.');
      if (post.userId !== sellerId)
        throw new ForbiddenException('Bạn không phải người đăng tin.');
      const buyer = await db.user.findUnique({ where: { phoneNumber: phone } });
      if (!buyer || buyer.isLocked || buyer.id === sellerId)
        throw new BadRequestException('Tài khoản khách hàng không hợp lệ.');
      const reserved = await db.transaction.findFirst({
        where: { postId, status: { in: RESERVED } },
      });
      if (
        reserved &&
        (reserved.buyerId !== buyer.id ||
          !['NEGOTIATING', 'SALE_PENDING'].includes(reserved.status))
      )
        throw new ConflictException(
          'Tin đang được giữ cho giao dịch khác hoặc đã hoàn tất.',
        );
      if (reserved?.status === 'SALE_PENDING') return reserved;
      if (!reserved && post.status !== 'ACTIVE')
        throw new ConflictException(
          'Chỉ tin đã duyệt và đang hiển thị mới được báo đã bán.',
        );
      const proposal =
        reserved ??
        (await db.transaction.findFirst({
          where: { postId, buyerId: buyer.id, sellerId, status: 'VERIFYING' },
        }));
      const saleRequestedAt = new Date();
      const transaction = proposal
        ? await db.transaction.update({
            where: { id: proposal.id },
            data: {
              status: 'SALE_PENDING',
              sellerConfirmed: true,
              buyerConfirmed: null,
              saleRequestedAt,
            },
          })
        : await db.transaction.create({
            data: {
              postId,
              buyerId: buyer.id,
              sellerId,
              status: 'SALE_PENDING',
              sellerConfirmed: true,
              saleRequestedAt,
            },
          });
      await db.posts.update({ where: { id: postId }, data: { status: 'HIDDEN' } });
      await db.transaction.updateMany({
        where: { postId, id: { not: transaction.id }, status: 'VERIFYING' },
        data: { status: 'CANCELLED' },
      });
      await this.notify(
        db,
        [buyer.id],
        `${transaction.id}:sale:${saleRequestedAt.getTime()}`,
        'Người bán yêu cầu xác nhận đã bán',
        `Người bán báo đã hoàn tất giao dịch “${post.title}” với bạn. Chỉ xác nhận nếu giao dịch thực sự đã hoàn tất.`,
      );
      return transaction;
    });
  }

  async verifyTransaction(
    id: string,
    userId: string,
    isConfirmed: boolean,
    expectedStatus: string,
  ) {
    if (typeof isConfirmed !== 'boolean')
      throw new BadRequestException('Phản hồi phải là true hoặc false.');
    if (!['VERIFYING', 'SALE_PENDING'].includes(expectedStatus))
      throw new BadRequestException('Cần xác định bước đang xác nhận.');
    return this.mutate(id, async (db) => {
      const transaction = await db.transaction.findUniqueOrThrow({
        where: { id },
        include: { post: true },
      });
      this.requireParticipant(transaction, userId);
      if (transaction.status !== expectedStatus)
        throw new ConflictException(
          'Trạng thái đã thay đổi. Vui lòng tải lại trước khi xác nhận.',
        );
      const parties = [transaction.buyerId, transaction.sellerId];
      if (transaction.status === 'SALE_PENDING') {
        if (userId !== transaction.buyerId)
          throw new ForbiddenException('Chỉ khách hàng được xác nhận đã bán.');
        if (!transaction.saleRequestedAt || transaction.sellerConfirmed !== true)
          throw new ConflictException('Người bán chưa gửi yêu cầu đã bán.');
        if (!isConfirmed) {
          const updated = await db.transaction.update({
            where: { id },
            data: {
              status: transaction.negotiatedAt ? 'NEGOTIATING' : 'CANCELLED',
              buyerConfirmed: !!transaction.negotiatedAt,
              sellerConfirmed: true,
              saleRequestedAt: null,
            },
          });
          if (!transaction.negotiatedAt)
            await db.posts.update({
              where: { id: transaction.postId },
              data: { status: 'ACTIVE' },
            });
          await this.notify(
            db,
            parties,
            `${id}:sale-declined:${transaction.saleRequestedAt.getTime()}`,
            'Khách hàng chưa xác nhận đã bán',
            transaction.negotiatedAt
              ? `“${transaction.post.title}” trở về đang thỏa thuận; chưa tạo hóa đơn. Bạn có thể hủy thỏa thuận để mở lại tin.`
              : `Yêu cầu đã bán cho “${transaction.post.title}” bị từ chối. Tin đã hiển thị lại, không tạo hóa đơn.`,
          );
          return updated;
        }
        const fee = this.calculateAppFee(
          transaction.post.posterType,
          transaction.post.transactionType,
          Number(transaction.post.price),
          transaction.post.brokerCommission ?? 0,
        );
        const updated = await db.transaction.update({
          where: { id },
          data: {
            status: 'SUCCESS',
            buyerConfirmed: true,
            completedAt: new Date(),
            calculatedFee: fee,
          },
        });
        await db.posts.update({
          where: { id: transaction.postId },
          data: { status: 'SOLD' },
        });
        await db.invoice.upsert({
          where: { transactionId: id },
          update: {},
          create: {
            transactionId: id,
            userId: transaction.sellerId,
            amount: fee,
            status: 'DRAFT',
          },
        });
        await this.notify(
          db,
          parties,
          `${id}:sold`,
          'Giao dịch đã hoàn tất',
          `Hai bên đã xác nhận đã bán “${transaction.post.title}”.`,
        );
        await this.notifyAdmins(
          db,
          `${id}:invoice`,
          'Hóa đơn giao dịch chờ duyệt',
          `Giao dịch “${transaction.post.title}” đã được khách hàng xác nhận. Hóa đơn nháp đang chờ xử lý.`,
        );
        return updated;
      }
      if (transaction.status !== 'VERIFYING') {
        if (['NEGOTIATING', 'SUCCESS', 'CANCELLED'].includes(transaction.status))
          return transaction;
        throw new ConflictException('Giao dịch không còn chờ xác nhận thỏa thuận.');
      }
      const field = userId === transaction.buyerId ? 'buyerConfirmed' : 'sellerConfirmed';
      if (transaction[field] !== null) return transaction;
      if (!isConfirmed) {
        const declined = await db.transaction.update({
          where: { id },
          data: { [field]: false, status: 'CANCELLED' },
        });
        await this.notify(
          db,
          parties,
          `${id}:declined`,
          'Chưa thống nhất thỏa thuận',
          'Một bên không xác nhận thỏa thuận. Tin vẫn hiển thị và không tạo hóa đơn.',
        );
        return declined;
      }
      const updated = await db.transaction.update({
        where: { id },
        data: { [field]: true },
      });
      if (!updated.buyerConfirmed || !updated.sellerConfirmed) return updated;
      if (
        transaction.post.status !== 'ACTIVE' ||
        (await db.transaction.findFirst({
          where: {
            postId: transaction.postId,
            id: { not: id },
            status: { in: RESERVED },
          },
        }))
      )
        throw new ConflictException('Tin không còn sẵn sàng để thỏa thuận.');
      await db.posts.update({
        where: { id: transaction.postId },
        data: { status: 'HIDDEN' },
      });
      await db.transaction.updateMany({
        where: { postId: transaction.postId, id: { not: id }, status: 'VERIFYING' },
        data: { status: 'CANCELLED' },
      });
      const negotiating = await db.transaction.update({
        where: { id },
        data: { status: 'NEGOTIATING', negotiatedAt: new Date() },
      });
      await this.notify(
        db,
        parties,
        `${id}:negotiating`,
        'Hai bên đang thỏa thuận',
        `Tin “${transaction.post.title}” được tạm ẩn. Nếu thỏa thuận không tiếp tục, hãy hủy trong lịch sử giao dịch để mở lại tin.`,
      );
      return negotiating;
    });
  }

  checkActiveTransaction(user1: string, user2: string, postId?: number) {
    return this.prisma.transaction.findFirst({
      where: {
        ...(postId ? { postId } : {}),
        status: { in: OPEN },
        OR: [
          { buyerId: user1, sellerId: user2 },
          { buyerId: user2, sellerId: user1 },
        ],
      },
      include: { post: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: {
        post: { select: { id: true, title: true, thumbnail: true } },
        invoice: true,
        buyer: { select: { id: true, fullName: true, phoneNumber: true } },
        seller: { select: { id: true, fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getPendingBuyerConfirmations(userId: string) {
    return this.prisma.transaction.findMany({
      where: {
        OR: [
          { status: 'VERIFYING', buyerId: userId, buyerConfirmed: null },
          { status: 'VERIFYING', sellerId: userId, sellerConfirmed: null },
          { status: 'SALE_PENDING', buyerId: userId, buyerConfirmed: null },
        ],
      },
      include: {
        post: { select: { id: true, title: true, thumbnail: true } },
        seller: { select: { fullName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async requestCancelAfterSuccess(id: string, userId: string, reason: string) {
    if (typeof reason !== 'string' || !reason.trim())
      throw new BadRequestException('Vui lòng nhập lý do hủy.');
    return this.mutate(id, async (db) => {
      const transaction = await db.transaction.findUniqueOrThrow({
        where: { id },
        include: { invoice: true },
      });
      this.requireParticipant(transaction, userId);
      if (['VERIFYING', 'NEGOTIATING', 'SALE_PENDING'].includes(transaction.status)) {
        const updated = await db.transaction.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelInitiatorId: userId,
            cancelReason: reason.trim(),
          },
        });
        if (transaction.status !== 'VERIFYING')
          await db.posts.update({
            where: { id: transaction.postId },
            data: { status: 'ACTIVE' },
          });
        await this.notify(
          db,
          [transaction.buyerId, transaction.sellerId],
          `${id}:cancelled`,
          'Thỏa thuận đã hủy',
          'Thỏa thuận đã dừng. Tin đã được mở lại nếu trước đó đang được giữ cho thỏa thuận này.',
        );
        return updated;
      }
      if (
        transaction.status === 'PENDING_CANCEL' &&
        transaction.cancelInitiatorId === userId
      )
        return transaction;
      if (transaction.status !== 'SUCCESS')
        throw new ConflictException(
          'Giao dịch không thể yêu cầu hủy ở trạng thái hiện tại.',
        );
      if (transaction.invoice?.status === 'PAID')
        throw new ConflictException(
          'Hóa đơn đã thanh toán. Vui lòng liên hệ admin để xử lý hoàn tiền.',
        );
      if (
        !transaction.completedAt ||
        Date.now() - transaction.completedAt.getTime() > 3 * 86_400_000
      )
        throw new ConflictException(
          'Đã quá thời hạn 3 ngày hoặc giao dịch cũ cần admin hỗ trợ.',
        );
      const updated = await db.transaction.update({
        where: { id },
        data: {
          status: 'PENDING_CANCEL',
          cancelInitiatorId: userId,
          cancelReason: reason.trim(),
        },
      });
      await this.notify(
        db,
        [transaction.buyerId === userId ? transaction.sellerId : transaction.buyerId],
        `${id}:cancel-request`,
        'Yêu cầu hủy giao dịch đã bán',
        reason.trim(),
      );
      return updated;
    });
  }

  private async cancelCompleted(
    db: Prisma.TransactionClient,
    transaction: { id: string; postId: number },
  ) {
    if (
      await db.invoice.findFirst({
        where: { transactionId: transaction.id, status: 'PAID' },
      })
    )
      throw new ConflictException('Cần xử lý hoàn tiền trước khi hủy.');
    await db.invoice.updateMany({
      where: { transactionId: transaction.id },
      data: { status: 'CANCELLED' },
    });
    await db.posts.update({
      where: { id: transaction.postId },
      data: { status: 'ACTIVE' },
    });
    return db.transaction.update({
      where: { id: transaction.id },
      data: { status: 'CANCELLED_AFTER_SUCCESS' },
    });
  }

  async respondToCancelRequest(id: string, userId: string, isAgreed: boolean) {
    if (typeof isAgreed !== 'boolean')
      throw new BadRequestException('Phản hồi không hợp lệ.');
    return this.mutate(id, async (db) => {
      const transaction = await db.transaction.findUniqueOrThrow({ where: { id } });
      this.requireParticipant(transaction, userId);
      if (transaction.status !== 'PENDING_CANCEL')
        throw new ConflictException('Giao dịch không chờ hủy.');
      if (transaction.cancelInitiatorId === userId)
        throw new ForbiddenException('Bạn không thể tự duyệt yêu cầu hủy.');
      const updated = isAgreed
        ? await this.cancelCompleted(db, transaction)
        : await db.transaction.update({ where: { id }, data: { status: 'DISPUTE' } });
      await this.notify(
        db,
        [transaction.buyerId, transaction.sellerId],
        `${id}:cancel-response`,
        isAgreed ? 'Giao dịch đã hủy' : 'Yêu cầu hủy cần đối soát',
        isAgreed
          ? 'Tin đã hiển thị lại và hóa đơn chưa thanh toán đã hủy.'
          : 'Admin sẽ xem xét yêu cầu hủy.',
      );
      if (!isAgreed)
        await this.notifyAdmins(
          db,
          `${id}:dispute`,
          'Tranh chấp hủy giao dịch',
          `Giao dịch #${id} cần admin đối soát.`,
        );
      return updated;
    });
  }

  async resolveDispute(id: string, resolution: 'SUCCESS' | 'CANCELLED') {
    if (!['SUCCESS', 'CANCELLED'].includes(resolution))
      throw new BadRequestException('Kết quả đối soát không hợp lệ.');
    return this.mutate(id, async (db) => {
      const transaction = await db.transaction.findUniqueOrThrow({ where: { id } });
      if (transaction.status !== 'DISPUTE')
        throw new ConflictException('Chỉ được đối soát giao dịch đang tranh chấp.');
      if (resolution === 'SUCCESS') {
        if (
          !transaction.completedAt ||
          !transaction.saleRequestedAt ||
          !transaction.buyerConfirmed ||
          !transaction.sellerConfirmed
        )
          throw new ConflictException('Admin không thể thay khách hàng xác nhận đã bán.');
        return db.transaction.update({ where: { id }, data: { status: 'SUCCESS' } });
      }
      const updated = transaction.completedAt
        ? await this.cancelCompleted(db, transaction)
        : await db.transaction.update({ where: { id }, data: { status: 'CANCELLED' } });
      if (!transaction.completedAt) {
        const anotherReservation = await db.transaction.findFirst({
          where: {
            postId: transaction.postId,
            id: { not: id },
            status: { in: RESERVED },
          },
        });
        if (!anotherReservation)
          await db.posts.update({
            where: { id: transaction.postId },
            data: { status: 'ACTIVE' },
          });
      }
      await this.notify(
        db,
        [transaction.buyerId, transaction.sellerId],
        `${id}:resolved-cancel`,
        'Admin đã xử lý hủy giao dịch',
        'Yêu cầu hủy đã được xử lý. Xem lịch sử giao dịch để biết kết quả.',
      );
      return updated;
    });
  }

  private withLateFee<
    T extends { amount: Prisma.Decimal; dueDate: Date | null; status: string },
  >(invoice: T) {
    const overdueMonths =
      invoice.dueDate && ['PENDING_PAYMENT', 'OVERDUE'].includes(invoice.status)
        ? Math.max(
            0,
            Math.ceil((Date.now() - invoice.dueDate.getTime()) / (30 * 86_400_000)),
          )
        : 0;
    const lateFee = Math.round(Number(invoice.amount) * 0.005 * overdueMonths);
    return {
      ...invoice,
      status: overdueMonths ? 'OVERDUE' : invoice.status,
      overdueMonths,
      lateFee,
      totalPayable: Number(invoice.amount) + lateFee,
    };
  }

  async getUserInvoices(userId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { userId },
      include: { transaction: { include: { post: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((invoice) => this.withLateFee(invoice));
  }

  async getAllInvoices() {
    const invoices = await this.prisma.invoice.findMany({
      include: {
        user: { select: { fullName: true, email: true, phoneNumber: true } },
        transaction: { include: { post: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invoices.map((invoice) => this.withLateFee(invoice));
  }

  async issueInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Không tìm thấy hóa đơn.');
    return this.mutate(invoice.transactionId, async (db) => {
      const current = await db.invoice.findUniqueOrThrow({
        where: { id },
        include: { transaction: true },
      });
      if (current.transaction.status !== 'SUCCESS')
        throw new ConflictException(
          'Chỉ phát hành hóa đơn cho giao dịch đã bán, không đang chờ hủy hoặc tranh chấp.',
        );
      if (current.status === 'PENDING_PAYMENT') return current;
      if (current.status !== 'DRAFT')
        throw new ConflictException('Chỉ hóa đơn nháp mới được phát hành.');
      const dueDate = new Date(Date.now() + 30 * 86_400_000);
      const updated = await db.invoice.update({
        where: { id },
        data: { status: 'PENDING_PAYMENT', dueDate },
      });
      await this.notify(
        db,
        [invoice.userId],
        `${id}:issued`,
        'Hóa đơn phí dịch vụ mới',
        `Hóa đơn #${id.slice(0, 8)} cần thanh toán trước ${dueDate.toLocaleDateString('vi-VN')}.`,
      );
      return updated;
    });
  }

  async deleteProcessedTransaction(id: string) {
    return this.mutate(id, async (db) => {
      const transaction = await db.transaction.findUniqueOrThrow({
        where: { id },
        include: { invoice: true },
      });
      if (
        transaction.invoice ||
        !['CANCELLED', 'CANCELLED_AFTER_SUCCESS'].includes(transaction.status)
      )
        throw new ConflictException(
          'Chỉ xóa thỏa thuận đã hủy và không có hóa đơn để giữ lịch sử đối soát.',
        );
      return db.transaction.delete({ where: { id } });
    });
  }
}
