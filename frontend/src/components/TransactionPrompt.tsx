'use client';

import { useState } from 'react';
import { apiFetch } from '@/services/api';

export type TransactionSummary = {
  id: string;
  status: string;
  buyerId: string;
  sellerId: string;
  buyerConfirmed: boolean | null;
  sellerConfirmed: boolean | null;
  post?: { title: string };
};
export const transactionLabels: Record<string, string> = {
  VERIFYING: 'Chờ xác nhận thỏa thuận',
  NEGOTIATING: 'Đang thỏa thuận',
  SALE_PENDING: 'Chờ khách xác nhận đã bán',
  SUCCESS: 'Đã bán',
  CANCELLED: 'Đã hủy thỏa thuận',
  PENDING_CANCEL: 'Chờ đồng ý hủy',
  CANCELLED_AFTER_SUCCESS: 'Đã hủy giao dịch',
  DISPUTE: 'Đang đối soát',
  FRAUD: 'Có dấu hiệu gian lận',
};

export default function TransactionPrompt({
  transaction,
  userId,
  onUpdated,
}: {
  transaction: TransactionSummary;
  userId: string;
  onUpdated?: (value: TransactionSummary) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const buyer = transaction.buyerId === userId;
  const participant = buyer || transaction.sellerId === userId;
  const canAnswer =
    participant &&
    ((transaction.status === 'VERIFYING' &&
      (buyer ? transaction.buyerConfirmed : transaction.sellerConfirmed) === null) ||
      (transaction.status === 'SALE_PENDING' && buyer));
  const sale = transaction.status === 'SALE_PENDING';
  const respond = async (isConfirmed: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await apiFetch(`transactions/${transaction.id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ isConfirmed, expectedStatus: transaction.status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Không thể gửi xác nhận.');
      setMessage(transactionLabels[result.data.status] || 'Đã gửi phản hồi.');
      onUpdated?.(result.data);
      window.dispatchEvent(new Event('transactions-updated'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-slate-800">
      <p className="text-sm font-bold">
        {canAnswer
          ? sale
            ? 'Bạn xác nhận giao dịch đã hoàn tất?'
            : 'Bạn có đang trong quá trình thỏa thuận?'
          : transactionLabels[transaction.status]}
      </p>
      <p className="mt-1 text-sm">{transaction.post?.title}</p>
      {canAnswer && (
        <>
          <p className="mt-2 text-xs leading-5 text-slate-600">
            {sale
              ? 'Người bán đã báo đã bán. Khi bạn xác nhận, tin chuyển sang đã bán và admin nhận hóa đơn nháp.'
              : 'Nếu cả hai đồng ý, tin sẽ tạm ẩn trong thời gian thỏa thuận. Chưa ghi nhận đã bán hoặc tạo hóa đơn.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() => respond(true)}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {sale ? 'Xác nhận đã hoàn tất' : 'Có, đang thỏa thuận'}
            </button>
            <button
              disabled={busy}
              onClick={() => respond(false)}
              className="rounded-lg border bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {sale ? 'Chưa hoàn tất' : 'Không'}
            </button>
          </div>
        </>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
