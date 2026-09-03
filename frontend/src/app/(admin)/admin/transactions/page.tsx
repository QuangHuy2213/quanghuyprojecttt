'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import Link from 'next/link';

const statusLabel: Record<string, string> = {
  SUCCESS: 'Đã giao dịch',
  VERIFYING: 'Chờ xác nhận',
  DISPUTE: 'Cần đối soát',
  FRAUD: 'Gian lận',
  PENDING_CANCEL: 'Chờ hủy',
  CANCELLED: 'Chưa giao dịch',
  CANCELLED_AFTER_SUCCESS: 'Đã hủy',
  DRAFT: 'Bản nháp',
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
};

type PopupKind = 'success' | 'error' | 'warning' | 'confirm';
type ConfirmVariant = 'primary' | 'danger' | 'success';

type PopupState = {
  type: PopupKind;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ConfirmVariant;
  onConfirm?: () => void | Promise<void>;
};

function AdminSystemPopup({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  const isConfirm = popup.type === 'confirm';

  const visual = {
    success: {
      iconWrap: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
    error: {
      iconWrap: 'border-rose-100 bg-rose-50 text-rose-600',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="m9 9 6 6M15 9l-6 6" />
        </svg>
      ),
    },
    warning: {
      iconWrap: 'border-amber-100 bg-amber-50 text-amber-600',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2.8 19a1.5 1.5 0 001.3 2.25h15.8A1.5 1.5 0 0021.2 19L12 3z" />
          <path strokeLinecap="round" d="M12 9v4M12 17h.01" />
        </svg>
      ),
    },
    confirm: {
      iconWrap: 'border-blue-100 bg-blue-50 text-blue-600',
      button:
        popup.confirmVariant === 'danger'
          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
          : popup.confirmVariant === 'success'
          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3z" />
          <path strokeLinecap="round" d="M9.5 12 11 13.5l3.5-4" />
        </svg>
      ),
    },
  }[popup.type];

  const handleConfirm = () => {
    const action = popup.onConfirm;
    onClose();
    action?.();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)]">
        <div className="p-7 sm:p-8">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${visual.iconWrap}`}>
            {visual.icon}
          </div>
          <div className="mt-5 text-center">
            <h3 className="text-xl font-black tracking-tight text-slate-900">{popup.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">{popup.message}</p>
          </div>
          <div className={`mt-7 flex ${isConfirm ? 'gap-3' : ''}`}>
            {isConfirm && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                {popup.cancelText || 'Hủy bỏ'}
              </button>
            )}
            <button
              type="button"
              onClick={isConfirm ? handleConfirm : onClose}
              className={`flex-1 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${visual.button}`}
            >
              {isConfirm ? popup.confirmText || 'Xác nhận' : 'Đã hiểu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 COMPONENT: MODAL GỬI CẢNH BÁO CHẶN MÀN HÌNH
// =========================================================================
function AdminWarningModal({
  targetUserId,
  targetUserName,
  onClose,
  onNotify,
}: {
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message: string) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [content, setContent] = useState(
    'Hệ thống phát hiện tài khoản của bạn có dấu hiệu cung cấp thông tin sai lệch nhằm trốn tránh phí nền tảng trong quá trình giao dịch. Yêu cầu bạn nghiêm túc tuân thủ quy định của Nhà Tốt.'
  );

  const handleSendWarning = async () => {
    if (!content.trim()) {
      onNotify('warning', 'Thiếu nội dung cảnh báo', 'Vui lòng nhập nội dung cảnh báo trước khi phát lệnh.');
      return;
    }

    setIsSending(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await apiFetch('notifications/admin/send-warning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetUserId, content: content }),
      });

      if (res.ok) {
        onClose();
        onNotify(
          'success',
          'Đã gửi cảnh báo',
          `Cảnh báo chặn màn hình đã được gửi thành công đến ${targetUserName}.`
        );
      } else {
        const data = await res.json().catch(() => ({}));
        onNotify('error', 'Gửi cảnh báo thất bại', data.message || 'Không thể gửi cảnh báo. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      console.error(error);
      onNotify('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/50 bg-white shadow-[0_28px_80px_-20px_rgba(15,23,42,0.45)] animate-fade-in-up">
        <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 px-6 py-5">
          <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-sm" />
          <div className="absolute -bottom-12 left-20 h-24 w-24 rounded-full bg-white/10 blur-sm" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg shadow-inner">
              🚨
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                Cảnh báo hệ thống
              </p>
              <h2 className="mt-0.5 text-lg font-black text-white">
                Gửi cảnh báo gian lận
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-2xl leading-none text-white/80 transition-all hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <div className="p-6 sm:p-7">
          <div className="mb-5">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Đối tượng nhận cảnh báo
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm shadow-rose-100/40">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-base shadow-sm">
                👤
              </span>
              <span className="truncate">{targetUserName}</span>
            </div>
          </div>

          <div className="mb-7">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Nội dung hiển thị chặn màn hình User
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-sm font-medium leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
            />
            <div className="mt-2 flex justify-end">
              <span className="text-[11px] font-medium text-slate-400">
                {content.length} ký tự
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={onClose}
              disabled={isSending}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSendWarning}
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/25 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
            >
              {isSending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isSending ? 'Đang phát lệnh...' : 'Phát lệnh ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 PAGE CHÍNH: QUẢN LÝ ĐỐI SOÁT (GIAO DỊCH & HÓA ĐƠN)
// =========================================================================
export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'INVOICES'>(
    'TRANSACTIONS'
  );

  // States cho Giao Dịch
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState('ALL');
  const [warningTarget, setWarningTarget] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  // States cho Hóa Đơn
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invFilter, setInvFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const showMessage = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setPopup({ type, title, message });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'Xác nhận',
    confirmVariant: ConfirmVariant = 'primary'
  ) => {
    setPopup({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText: 'Hủy bỏ',
      confirmVariant,
      onConfirm,
    });
  };

  // Lấy dữ liệu.
  // Chỉ hiển thị loading toàn trang ở lần tải đầu tiên.
  // Những lần tự đồng bộ sau đó chạy nền để tránh trang bị quay lại màn hình loading mỗi 15 giây.
  const fetchData = async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
    else setRefreshing(true);

    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [txRes, invRes] = await Promise.all([
        apiFetch('admin/transactions', { headers }),
        apiFetch('transactions/invoices/admin/all', { headers }),
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (invRes.ok) setInvoices(await invRes.json());
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
    } finally {
      if (showFullLoader) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const timer = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(timer);
  }, []);

  // --- Xử lý Giao dịch ---
  const handleResolveDispute = (transactionId: string, action: 'APPROVE' | 'CANCEL') => {
    const isApprove = action === 'APPROVE';

    showConfirm(
      isApprove ? 'Công nhận giao dịch?' : 'Hủy giao dịch?',
      isApprove
        ? 'Bạn có chắc muốn phê duyệt và công nhận giao dịch này là thành công?'
        : 'Bạn có chắc muốn hủy giao dịch này? Trạng thái giao dịch sẽ được cập nhật ngay sau khi xác nhận.',
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await apiFetch(`admin/transactions/${transactionId}/resolve`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              resolutionStatus: isApprove ? 'SUCCESS' : 'CANCELLED',
            }),
          });

          if (res.ok) {
            showMessage(
              'success',
              'Đã xử lý tranh chấp',
              isApprove ? 'Giao dịch đã được công nhận thành công.' : 'Giao dịch đã được hủy thành công.'
            );
            fetchData(false);
          } else {
            const data = await res.json().catch(() => ({}));
            showMessage('error', 'Không thể xử lý giao dịch', data.message || 'Máy chủ từ chối yêu cầu xử lý tranh chấp.');
          }
        } catch (error) {
          console.error(error);
          showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        }
      },
      isApprove ? 'Công nhận giao dịch' : 'Hủy giao dịch',
      isApprove ? 'success' : 'danger'
    );
  };

  const handleDelete = (transactionId: string) => {
    showConfirm(
      'Xóa giao dịch đã xử lý?',
      'Giao dịch sẽ bị xóa khỏi danh sách và dữ liệu hóa đơn liên quan cũng có thể bị xóa. Hành động này không nên thực hiện nếu bạn vẫn cần dữ liệu đối soát.',
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await apiFetch(`transactions/admin/${transactionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            showMessage('success', 'Đã xóa giao dịch', 'Giao dịch đã được xóa khỏi danh sách thành công.');
            fetchData(false);
          } else {
            showMessage('error', 'Chưa thể xóa giao dịch', data.message || 'Máy chủ từ chối yêu cầu xóa giao dịch này.');
          }
        } catch (error) {
          console.error(error);
          showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        }
      },
      'Xóa giao dịch',
      'danger'
    );
  };

  // --- Xử lý Hóa đơn ---
  const handleIssueInvoice = (invoiceId: string) => {
    showConfirm(
      'Phát hành hóa đơn?',
      'Hóa đơn sẽ được phát hành và yêu cầu thanh toán sẽ được gửi đến người dùng.',
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await apiFetch(`transactions/invoices/admin/${invoiceId}/issue`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            showMessage('success', 'Phát hành hóa đơn thành công', 'Hóa đơn đã được phát hành và yêu cầu thanh toán đã được gửi đến người dùng.');
            fetchData(false);
          } else {
            const data = await res.json().catch(() => ({}));
            showMessage('error', 'Không thể phát hành hóa đơn', data.message || 'Máy chủ từ chối yêu cầu phát hành hóa đơn.');
          }
        } catch (error) {
          console.error(error);
          showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        }
      },
      'Phát hành hóa đơn',
      'primary'
    );
  };

  // Lọc dữ liệu
  const filteredTx = transactions.filter(
    (tx) => txFilter === 'ALL' || tx.status === txFilter
  );
  const filteredInv = invoices.filter(
    (inv) => invFilter === 'ALL' || inv.status === invFilter
  );

  const totalRevenue = transactions
    .filter((tx) => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + (Number(tx.calculatedFee) || 0), 0);
  const totalCollected = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const disputeCount = transactions.filter((tx) => tx.status === 'DISPUTE').length;
  const verifyingCount = transactions.filter((tx) => tx.status === 'VERIFYING').length;
  const pendingInvoiceCount = invoices.filter((inv) => inv.status === 'PENDING_PAYMENT').length;

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-5 rounded-3xl border border-slate-200/70 bg-white shadow-[0_20px_55px_-32px_rgba(15,23,42,0.35)]">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
          <div className="absolute inset-0 m-auto h-5 w-5 rounded-full bg-blue-50" />
        </div>
        <div className="text-center">
          <span className="block text-sm font-extrabold tracking-wide text-slate-700">
            Đang tải dữ liệu đối soát...
          </span>
          <span className="mt-1 block text-xs font-medium text-slate-400">
            Hệ thống đang đồng bộ giao dịch và hóa đơn
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_22px_70px_-38px_rgba(15,23,42,0.32)] sm:p-6 lg:p-7">
      {popup && <AdminSystemPopup popup={popup} onClose={() => setPopup(null)} />}
      {warningTarget && (
        <AdminWarningModal
          targetUserId={warningTarget.userId}
          targetUserName={warningTarget.userName}
          onClose={() => setWarningTarget(null)}
          onNotify={showMessage}
        />
      )}

      {/* HEADER TABS & THỐNG KÊ */}
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="w-full md:w-auto">
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]" />
            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              Quản trị tài chính
            </span>
          </div>

          <div className="flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1.5 shadow-inner shadow-slate-100 md:w-auto">
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all duration-200 md:flex-none ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-200/70 ring-1 ring-slate-200/70'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              Giao dịch & đối soát
            </button>
            <button
              onClick={() => setActiveTab('INVOICES')}
              className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all duration-200 md:flex-none ${
                activeTab === 'INVOICES'
                  ? 'bg-white text-emerald-700 shadow-md shadow-slate-200/70 ring-1 ring-slate-200/70'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              Hóa đơn thanh toán
            </button>
          </div>
        </div>

        <div
          className={`relative w-full overflow-hidden rounded-2xl px-6 py-4 text-white shadow-lg md:w-auto md:min-w-[280px] ${
            activeTab === 'TRANSACTIONS'
              ? 'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-blue-500/20'
              : 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 shadow-emerald-500/20'
          }`}
        >
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 right-16 h-20 w-20 rounded-full bg-white/10" />
          <div className="relative flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
              {activeTab === 'TRANSACTIONS'
                ? 'Tổng phí nền tảng dự kiến'
                : 'Tổng tiền đã thu'}
            </span>
            <div className="mt-1 flex items-end gap-2">
              <span className="font-mono text-xl font-black tracking-tight sm:text-2xl">
                {activeTab === 'TRANSACTIONS'
                  ? totalRevenue.toLocaleString()
                  : totalCollected.toLocaleString()}
              </span>
              <span className="pb-0.5 text-xs font-bold text-white/75">VNĐ</span>
            </div>
          </div>
        </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="text-sm font-bold text-slate-500">Tổng giao dịch</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{transactions.length}</div>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3.5">
            <div className="text-sm font-bold text-rose-600">Cần đối soát / xác minh</div>
            <div className="mt-1 text-2xl font-black text-rose-700">{disputeCount + verifyingCount}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 text-sm font-bold text-amber-700">
              <span>Hóa đơn chờ thanh toán</span>
              {refreshing && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                  Đồng bộ
                </span>
              )}
            </div>
            <div className="mt-1 text-2xl font-black text-amber-800">{pendingInvoiceCount}</div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🌟 TAB 1: GIAO DỊCH */}
      {/* ========================================================= */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              'ALL',
              'SUCCESS',
              'VERIFYING',
              'DISPUTE',
              'FRAUD',
              'PENDING_CANCEL',
              'CANCELLED_AFTER_SUCCESS',
            ].map((status) => (
              <button
                key={status}
                onClick={() => setTxFilter(status)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                  txFilter === status
                    ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/15'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'Tất cả' : statusLabel[status] || status}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-5 py-4">Bài đăng</th>
                  <th className="px-5 py-4">Người mua và người bán</th>
                  <th className="px-5 py-4">Giá trị giao dịch</th>
                  <th className="px-5 py-4">Phí nền tảng</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                          ⌕
                        </div>
                        <span className="text-sm font-bold text-slate-500">
                          Không tìm thấy giao dịch
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          Thử chọn một trạng thái khác để xem dữ liệu.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr
                      key={tx.id}
                      className="group transition-colors duration-200 hover:bg-blue-50/60"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/posts/${tx.postId}`}
                          className="inline-flex max-w-[240px] items-center gap-2 font-bold text-slate-800 transition-colors hover:text-blue-700"
                        >
                          <span className="truncate">
                            {tx.post?.title || 'Xem bài đăng'}
                          </span>
                          <span className="text-xs text-slate-300 transition-colors group-hover:text-blue-400">
                            ↗
                          </span>
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-[190px] space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="w-9 rounded-md bg-blue-50 px-1.5 py-1 text-center text-xs font-black uppercase text-blue-600">
                              Mua
                            </span>
                            <span className="min-w-0 flex-1 truncate font-bold">
                              {tx.buyer?.fullName || tx.buyerId?.substring(0, 6)}
                            </span>
                            <button
                              onClick={() =>
                                setWarningTarget({
                                  userId: tx.buyerId,
                                  userName: tx.buyer?.fullName || 'Người Mua',
                                })
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100"
                              title="Cảnh báo"
                            >
                              ⚠️
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="w-9 rounded-md bg-violet-50 px-1.5 py-1 text-center text-xs font-black uppercase text-violet-600">
                              Bán
                            </span>
                            <span className="min-w-0 flex-1 truncate font-bold">
                              {tx.seller?.fullName || tx.sellerId?.substring(0, 6)}
                            </span>
                            <button
                              onClick={() =>
                                setWarningTarget({
                                  userId: tx.sellerId,
                                  userName: tx.seller?.fullName || 'Người Bán',
                                })
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100"
                              title="Cảnh báo"
                            >
                              ⚠️
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap font-mono text-sm font-bold text-slate-700">
                          {Number(tx.post?.price || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap font-mono text-sm font-black text-blue-700">
                          {tx.calculatedFee
                            ? Number(tx.calculatedFee).toLocaleString()
                            : '--'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-black ${
                            tx.status === 'SUCCESS'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : tx.status === 'DISPUTE'
                                ? 'animate-pulse border-rose-200 bg-rose-50 text-rose-700'
                                : tx.status === 'FRAUD'
                                  ? 'border-red-200 bg-red-50 text-red-700'
                                  : tx.status === 'VERIFYING'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              tx.status === 'SUCCESS'
                                ? 'bg-emerald-500'
                                : tx.status === 'DISPUTE' || tx.status === 'FRAUD'
                                  ? 'bg-rose-500'
                                  : tx.status === 'VERIFYING'
                                    ? 'bg-amber-500'
                                    : 'bg-slate-400'
                            }`}
                          />
                          {statusLabel[tx.status] || tx.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {tx.status === 'DISPUTE' ? (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() =>
                                handleResolveDispute(tx.id, 'APPROVE')
                              }
                              className="w-full max-w-[150px] rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-700 transition-all hover:border-emerald-300 hover:bg-emerald-100"
                            >
                              Công nhận giao dịch
                            </button>
                            <button
                              onClick={() =>
                                handleResolveDispute(tx.id, 'CANCEL')
                              }
                              className="w-full max-w-[150px] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-extrabold text-rose-700 transition-all hover:border-rose-300 hover:bg-rose-100"
                            >
                              Hủy giao dịch
                            </button>
                          </div>
                        ) : ['SUCCESS', 'CANCELLED', 'CANCELLED_AFTER_SUCCESS', 'FRAUD'].includes(
                            tx.status
                          ) ? (
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-2 text-sm font-extrabold text-rose-600 transition-all hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700"
                          >
                            Xóa
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            Đang hoạt động
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🌟 TAB 2: HÓA ĐƠN */}
      {/* ========================================================= */}
      {activeTab === 'INVOICES' && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {['ALL', 'DRAFT', 'PENDING_PAYMENT', 'PAID', 'OVERDUE', 'CANCELLED'].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setInvFilter(status)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                    invFilter === status
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/15'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? 'Tất cả' : statusLabel[status] || status}
                </button>
              )
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-5 py-4">Bài đăng</th>
                  <th className="px-5 py-4">Người thanh toán</th>
                  <th className="px-5 py-4">Số tiền cần thu</th>
                  <th className="px-5 py-4">Hạn thanh toán</th>
                  <th className="px-5 py-4">Trạng thái</th>
                  <th className="px-5 py-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInv.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-400">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                          🧾
                        </div>
                        <span className="text-sm font-bold text-slate-500">
                          Chưa có hóa đơn nào
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          Hóa đơn phát sinh sẽ hiển thị tại đây.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInv.map((inv) => (
                    <tr
                      key={inv.id}
                      className="group transition-colors duration-200 hover:bg-emerald-50/35"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/posts/${inv.transaction?.post?.id}`}
                          className="inline-flex max-w-[240px] items-center gap-2 font-bold text-slate-800 transition-colors hover:text-blue-700"
                        >
                          <span className="truncate">
                            {inv.transaction?.post?.title || 'Xem bài đăng'}
                          </span>
                          <span className="text-xs text-slate-300 transition-colors group-hover:text-blue-400">
                            ↗
                          </span>
                        </Link>
                      </td>

                      <td className="px-5 py-4">
                        <div className="min-w-[180px]">
                          <div className="text-sm font-extrabold text-slate-800">
                            {inv.user?.fullName}
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-slate-400">
                            {inv.user?.phoneNumber || inv.user?.email}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap font-mono text-sm font-black text-emerald-700">
                          {Number(
                            inv.totalPayable || inv.amount || 0
                          ).toLocaleString()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap text-sm font-semibold text-slate-600">
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString('vi-VN')
                            : '--'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-xs font-black ${
                            inv.status === 'PAID'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : inv.status === 'PENDING_PAYMENT'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : inv.status === 'OVERDUE'
                                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-500'
                                : inv.status === 'PENDING_PAYMENT'
                                  ? 'bg-amber-500'
                                  : inv.status === 'OVERDUE'
                                    ? 'bg-rose-500'
                                    : 'bg-slate-400'
                            }`}
                          />
                          {statusLabel[inv.status] || inv.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {inv.status === 'DRAFT' ? (
                          <button
                            onClick={() => handleIssueInvoice(inv.id)}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25"
                          >
                            Gửi hóa đơn
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-400">
                            <span className="text-emerald-500">✓</span>
                            Đã xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
