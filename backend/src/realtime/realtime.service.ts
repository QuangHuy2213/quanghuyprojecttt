import { Injectable, Logger } from '@nestjs/common';
import { Invoice, Notification, Prisma, Transaction } from '@prisma/client';
import { Server } from 'socket.io';

export const transactionDto = (row: Transaction) => ({
  id: row.id, postId: row.postId, buyerId: row.buyerId, sellerId: row.sellerId,
  status: row.status, buyerConfirmed: row.buyerConfirmed, sellerConfirmed: row.sellerConfirmed,
  saleRequestedAt: row.saleRequestedAt?.toISOString() ?? null,
  negotiatedAt: row.negotiatedAt?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null,
  cancelInitiatorId: row.cancelInitiatorId, cancelReason: row.cancelReason,
  calculatedFee: row.calculatedFee?.toString() ?? null,
  createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
export const invoiceDto = (row: Invoice) => ({
  id: row.id, transactionId: row.transactionId, userId: row.userId, status: row.status,
  amount: row.amount.toString(), dueDate: row.dueDate?.toISOString() ?? null,
  paidAt: row.paidAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
export const warningDto = (row: Notification) => ({
  id: row.id, userId: row.userId, title: row.title, content: row.content, type: row.type,
  isRead: row.isRead, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
});
export type WorkflowSnapshot = { transactions: ReturnType<typeof transactionDto>[]; invoices: ReturnType<typeof invoiceDto>[] };

@Injectable()
export class RealtimeService {
  private server?: Server;
  private readonly logger = new Logger(RealtimeService.name);
  attach(server: Server) { this.server = server; }
  private emit(event: string, rooms: string[], payload: { id: string | number; [key: string]: unknown }) {
    // A transport failure after commit must never turn a successful REST write into failure.
    try {
      this.server?.to([...new Set(rooms)]).emit(event, payload);
      if (process.env.NODE_ENV !== 'production') this.logger.debug(`[WS EMIT] ${event} id=${payload.id}`);
    } catch { this.logger.warn(`[WS ERROR] event=${event} id=${payload.id}`); }
  }
  warning(row: Notification) {
    if (row.type !== 'WARNING_POPUP') return;
    this.emit(row.isRead ? 'warning:acknowledged' : 'warning:new', [`user:${row.userId}`], warningDto(row));
  }
  invoice(row: Invoice) {
    this.emit('invoice:updated', [`user:${row.userId}`, 'role:ADMIN'], invoiceDto(row));
  }
  async capture(db: Prisma.TransactionClient, postId: number): Promise<WorkflowSnapshot> {
    const transactions = await db.transaction.findMany({ where: { postId } });
    const invoices = await db.invoice.findMany({ where: { transaction: { postId } } });
    return { transactions: transactions.map(transactionDto), invoices: invoices.map(invoiceDto) };
  }
  publish(before: WorkflowSnapshot, after: WorkflowSnapshot) {
    for (const row of after.transactions) {
      if (JSON.stringify(before.transactions.find(old => old.id === row.id)) === JSON.stringify(row)) continue;
      this.emit('transaction:updated', [`user:${row.buyerId}`, `user:${row.sellerId}`, 'role:ADMIN'], row);
    }
    for (const row of before.transactions) if (!after.transactions.some(item => item.id === row.id)) {
      this.emit('transaction:deleted', [`user:${row.buyerId}`, `user:${row.sellerId}`, 'role:ADMIN'], {
        ...row, deleted: true,
      });
    }
    for (const row of after.invoices) {
      if (JSON.stringify(before.invoices.find(old => old.id === row.id)) === JSON.stringify(row)) continue;
      // One event is sufficient for both insert and update; client upserts by ID.
      this.emit('invoice:updated', [`user:${row.userId}`, 'role:ADMIN'], row);
    }
  }
}
