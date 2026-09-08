import { parseTimestamp } from './timestamps';

export const transactionStatuses = ['VERIFYING', 'NEGOTIATING', 'SALE_PENDING', 'SUCCESS', 'FRAUD', 'DISPUTE', 'CANCELLED', 'PENDING_CANCEL', 'CANCELLED_AFTER_SUCCESS'] as const;
export type VersionedRow = { id: string; updatedAt?: string; [key: string]: any };
export type TransactionRow = VersionedRow & { status: string; buyerId: string; sellerId: string; buyerConfirmed: boolean | null; sellerConfirmed: boolean | null };

export function mergeRows<T extends VersionedRow>(current: T[], incoming: T[]): T[] {
  const rows = new Map(current.map(row => [row.id, row]));
  for (const row of incoming) {
    if (!row || typeof row.id !== 'string' || !row.id) continue;
    const old = rows.get(row.id);
    const oldTime = parseTimestamp(old?.updatedAt)?.getTime() ?? 0;
    const newTime = parseTimestamp(row.updatedAt)?.getTime() ?? 0;
    // Keep relations from API snapshots even when their scalar state is stale.
    rows.set(row.id, old && oldTime > newTime ? { ...row, ...old } : { ...old, ...row });
  }
  return [...rows.values()];
}

export function mergeSnapshot<T extends VersionedRow>(current: T[], incoming: T[], baseline: T[]): T[] {
  const ids = new Set(incoming.map(row => row.id));
  const started = new Map(baseline.map(row => [row.id, row]));
  // These endpoints return the complete owned collection. Remove a missing row only
  // if it was already present before GET and no event/API response has changed it.
  const existing = new Map(current.map(row => [row.id, row]));
  const snapshot = incoming.map(row => {
    const live = existing.get(row.id);
    if (live && started.get(row.id) !== live &&
        (parseTimestamp(live.updatedAt)?.getTime() ?? 0) >= (parseTimestamp(row.updatedAt)?.getTime() ?? 0))
      return { ...row, ...live };
    return row;
  });
  return mergeRows(current.filter(row => ids.has(row.id) || started.get(row.id) !== row), snapshot);
}

// Display-only projection of the existing backend withLateFee calculation.
// Payment amounts are still calculated and validated by NestJS.
export function invoiceForDisplay(row: VersionedRow, now = Date.now()): VersionedRow {
  const due = parseTimestamp(row.dueDate)?.getTime();
  const overdueMonths = due !== undefined && ['PENDING_PAYMENT', 'OVERDUE'].includes(row.status)
    ? Math.max(0, Math.ceil((now - due) / (30 * 86_400_000))) : 0;
  const lateFee = Math.round(Number(row.amount) * 0.005 * overdueMonths);
  return { ...row, status: overdueMonths ? 'OVERDUE' : row.status, overdueMonths, lateFee, totalPayable: Number(row.amount) + lateFee };
}

export const transactionAction: Record<string, string> = {
  VERIFYING: 'Chờ hai bên xác nhận', NEGOTIATING: 'Đang theo dõi', SALE_PENDING: 'Chờ xác nhận',
  SUCCESS: 'Đã hoàn tất', PENDING_CANCEL: 'Chờ xử lý', CANCELLED: 'Đã kết thúc',
  CANCELLED_AFTER_SUCCESS: 'Đã kết thúc', DISPUTE: 'Đối soát', FRAUD: 'Kiểm tra',
};
export const pendingConfirmation = (row: VersionedRow, userId: string) =>
  (row.status === 'VERIFYING' && ((row.buyerId === userId && row.buyerConfirmed === null) ||
    (row.sellerId === userId && row.sellerConfirmed === null))) ||
  (row.status === 'SALE_PENDING' && row.buyerId === userId && row.buyerConfirmed === null);
