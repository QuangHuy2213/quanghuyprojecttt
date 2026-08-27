'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

const txLabels: Record<string, string> = {
  VERIFYING: 'Chờ xác nhận',
  SUCCESS: 'Đã giao dịch',
  DISPUTE: 'Đang đối soát',
  CANCELLED: 'Chưa giao dịch',
  PENDING_CANCEL: 'Chờ hủy',
  CANCELLED_AFTER_SUCCESS: 'Đã hủy sau giao dịch',
  FRAUD: 'Có dấu hiệu gian lận',
};

const invLabels: Record<string, string> = {
  DRAFT: 'Chờ admin phát hành',
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  CANCELLED: 'Đã hủy',
};

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
};

type CancelModalState = {
  isOpen: boolean;
  id: string;
  reason: string;
  sending: boolean;
};

type ActionModalState = {
  isOpen: boolean;
  id: string;
  action: 'agree' | 'dispute' | null;
  sending: boolean;
};

export default function TransactionsAndInvoicesPage() {
  const [tab, setTab] = useState<'transactions' | 'invoices'>('transactions');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [user, setUser] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });

  const [cancelModal, setCancelModal] = useState<CancelModalState>({
    isOpen: false,
    id: '',
    reason: '',
    sending: false,
  });

  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    id: '',
    action: null,
    sending: false,
  });

  const load = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setLoading(true);
    else setRefreshing(true);

    const token = localStorage.getItem('access_token');
    const stored = localStorage.getItem('user');

    if (!token || !stored) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setUser(JSON.parse(stored));
    } catch {
      setUser(undefined);
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [transactionsRes, invoicesRes] = await Promise.all([
        fetch(apiUrl('transactions/my-transactions'), {
          headers,
          cache: 'no-store',
        }),
        fetch(apiUrl('transactions/my-invoices'), {
          headers,
          cache: 'no-store',
        }),
      ]);

      if (transactionsRes.ok) {
        setTransactions(await transactionsRes.json());
      }

      if (invoicesRes.ok) {
        setInvoices(await invoicesRes.json());
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu giao dịch:', error);
    } finally {
      if (showFullLoader) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);

    const timer = setInterval(() => {
      load(false);
    }, 15000);

    return () => clearInterval(timer);
  }, [load]);

  const notify = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setToast({ show: true, message, type });

    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  const openCancelModal = (id: string) => {
    setCancelModal({
      isOpen: true,
      id,
      reason: '',
      sending: false,
    });
  };

  const requestCancel = async (e: React.FormEvent) => {
    e.preventDefault();

    const reason = cancelModal.reason.trim();
    if (!reason) {
      notify('Vui lòng nhập lý do hủy giao dịch.', 'error');
      return;
    }

    setCancelModal((prev) => ({ ...prev, sending: true }));

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        apiUrl(`transactions/${cancelModal.id}/request-cancel`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setCancelModal({
          isOpen: false,
          id: '',
          reason: '',
          sending: false,
        });
        notify('Đã gửi yêu cầu hủy tới đối tác.', 'success');
        load(false);
      } else {
        notify(data.message || 'Không thể gửi yêu cầu hủy.', 'error');
        setCancelModal((prev) => ({ ...prev, sending: false }));
      }
    } catch (error) {
      console.error(error);
      notify('Lỗi kết nối máy chủ. Vui lòng thử lại.', 'error');
      setCancelModal((prev) => ({ ...prev, sending: false }));
    }
  };

  const openRespondModal = (
    id: string,
    action: 'agree' | 'dispute'
  ) => {
    setActionModal({
      isOpen: true,
      id,
      action,
      sending: false,
    });
  };

  const respondCancel = async () => {
    if (!actionModal.action) return;

    const isAgreed = actionModal.action === 'agree';

    setActionModal((prev) => ({ ...prev, sending: true }));

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        apiUrl(`transactions/${actionModal.id}/respond-cancel`),
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isAgreed }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setActionModal({
          isOpen: false,
          id: '',
          action: null,
          sending: false,
        });

        notify(
          isAgreed
            ? 'Đã đồng ý hủy giao dịch.'
            : 'Đã chuyển tranh chấp tới admin.',
          isAgreed ? 'success' : 'info'
        );

        load(false);
      } else {
        notify(data.message || 'Không thể xử lý yêu cầu.', 'error');
        setActionModal((prev) => ({ ...prev, sending: false }));
      }
    } catch (error) {
      console.error(error);
      notify('Lỗi kết nối máy chủ. Vui lòng thử lại.', 'error');
      setActionModal((prev) => ({ ...prev, sending: false }));
    }
  };

  const pay = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl('payments/pay-invoice'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId: id }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.paymentUrl) {
        location.href = data.paymentUrl;
      } else {
        notify(data.message || 'Không thể tạo phiên thanh toán.', 'error');
      }
    } catch (error) {
      console.error(error);
      notify('Không thể kết nối cổng thanh toán.', 'error');
    }
  };

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === 'PENDING_PAYMENT'
  ).length;

  const completedTransactions = transactions.filter(
    (tx) => tx.status === 'SUCCESS'
  ).length;

  const disputeTransactions = transactions.filter((tx) =>
    ['DISPUTE', 'PENDING_CANCEL', 'FRAUD'].includes(tx.status)
  ).length;

  if (loading) {
    return (
      <div className="user-page-shell min-h-screen bg-slate-50">
        <Header />
        <div className="grid min-h-[65vh] place-items-center px-4">
          <div className="flex flex-col items-center rounded-[28px] border border-slate-200 bg-white px-10 py-9 shadow-sm">
            <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
            <div className="mt-4 text-base font-black text-slate-900">
              Đang tải dữ liệu tài chính
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              Giao dịch và hóa đơn đang được đồng bộ...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page-shell min-h-screen bg-slate-100/70">
      <Header />

      {/* POPUP THÔNG BÁO */}
      <div
        className={`fixed left-1/2 top-24 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300 ${
          toast.show
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div
          className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ${
            toast.type === 'error'
              ? 'border-rose-200'
              : toast.type === 'info'
              ? 'border-amber-200'
              : 'border-emerald-200'
          }`}
        >
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg font-black ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-600'
                : toast.type === 'info'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {toast.type === 'error'
              ? '!'
              : toast.type === 'info'
              ? 'i'
              : '✓'}
          </div>

          <div className="pt-0.5">
            <div className="text-sm font-black text-slate-900">
              {toast.type === 'error'
                ? 'Có lỗi xảy ra'
                : toast.type === 'info'
                ? 'Thông báo'
                : 'Thành công'}
            </div>
            <div className="mt-1 text-sm font-medium leading-6 text-slate-600">
              {toast.message}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-[30px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-7 text-white shadow-xl sm:p-9">
          <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-blue-200">
                Tài chính cá nhân
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Lịch sử giao dịch & hóa đơn
              </h1>

              <p className="mt-3 max-w-2xl text-[15px] font-medium leading-7 text-slate-300">
                Theo dõi trạng thái giao dịch, yêu cầu hủy và các khoản phí cần
                thanh toán. Hóa đơn có thời hạn 30 ngày; phí chậm thanh toán là
                0,5% phí gốc cho mỗi tháng trễ.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <div className="text-xs font-bold text-slate-400">Giao dịch</div>
                <div className="mt-1 text-2xl font-black">
                  {transactions.length}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/10 px-4 py-3 backdrop-blur">
                <div className="text-xs font-bold text-emerald-200">Hoàn tất</div>
                <div className="mt-1 text-2xl font-black">
                  {completedTransactions}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-400/10 bg-rose-400/10 px-4 py-3 backdrop-blur">
                <div className="text-xs font-bold text-rose-200">Cần xử lý</div>
                <div className="mt-1 text-2xl font-black">
                  {disputeTransactions}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TAB */}
        <div className="mt-6 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1.5 sm:w-auto">
            <button
              onClick={() => setTab('transactions')}
              className={`flex-1 rounded-xl px-5 py-3 text-sm font-extrabold transition-all sm:flex-none ${
                tab === 'transactions'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lịch sử giao dịch
            </button>

            <button
              onClick={() => setTab('invoices')}
              className={`flex-1 rounded-xl px-5 py-3 text-sm font-extrabold transition-all sm:flex-none ${
                tab === 'invoices'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hóa đơn ({pendingInvoices})
            </button>
          </div>

          <div className="flex items-center gap-2 px-2 pb-1 text-xs font-bold text-slate-500 sm:pb-0">
            <span
              className={`h-2 w-2 rounded-full ${
                refreshing ? 'animate-pulse bg-blue-500' : 'bg-emerald-500'
              }`}
            />
            {refreshing ? 'Đang đồng bộ dữ liệu...' : 'Dữ liệu đã cập nhật'}
          </div>
        </div>

        {/* CONTENT */}
        <div className="mt-5 grid gap-4">
          {tab === 'transactions'
            ? transactions.map((tx) => (
                <article
                  key={tx.id}
                  className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
                    <img
                      src={
                        tx.post?.thumbnail ||
                        'https://via.placeholder.com/160'
                      }
                      className="h-36 w-full rounded-2xl border border-slate-200 object-cover md:h-24 md:w-36"
                      alt=""
                    />

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/posts/${tx.postId}`}
                        className="line-clamp-2 text-lg font-black leading-6 text-slate-900 transition-colors hover:text-blue-700"
                      >
                        {tx.post?.title || 'Tin bất động sản'}
                      </Link>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-600">
                          {tx.buyerId === user?.id
                            ? 'Vai trò: Người mua'
                            : 'Vai trò: Người bán'}
                        </span>

                        <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-blue-700">
                          {txLabels[tx.status] || tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {tx.status === 'SUCCESS' && (
                        <button
                          onClick={() => openCancelModal(tx.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition-all hover:bg-rose-100 active:scale-[0.98]"
                        >
                          Yêu cầu hủy
                        </button>
                      )}

                      {tx.status === 'PENDING_CANCEL' &&
                        tx.cancelInitiatorId !== user?.id && (
                          <>
                            <button
                              onClick={() =>
                                openRespondModal(tx.id, 'agree')
                              }
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.98]"
                            >
                              Đồng ý hủy
                            </button>

                            <button
                              onClick={() =>
                                openRespondModal(tx.id, 'dispute')
                              }
                              className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700 active:scale-[0.98]"
                            >
                              Phản đối
                            </button>
                          </>
                        )}
                    </div>
                  </div>
                </article>
              ))
            : invoices.map((inv) => (
                <article
                  key={inv.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-500">
                        Hóa đơn thanh toán
                      </div>

                      <Link
                        href={`/posts/${inv.transaction?.post?.id}`}
                        className="block text-lg font-black leading-6 text-slate-900 transition-colors hover:text-blue-700"
                      >
                        {inv.transaction?.post?.title ||
                          'Tin bất động sản'}
                      </Link>

                      <p className="mt-3 text-sm font-medium text-slate-600">
                        Hạn thanh toán:{' '}
                        <b className="font-extrabold text-slate-900">
                          {inv.dueDate
                            ? new Date(inv.dueDate).toLocaleDateString(
                                'vi-VN'
                              )
                            : 'Chờ phát hành'}
                        </b>
                      </p>

                      {inv.overdueMonths > 0 && (
                        <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-extrabold text-rose-700">
                          Trễ {inv.overdueMonths} tháng · Phí chậm{' '}
                          {Number(inv.lateFee).toLocaleString('vi-VN')} ₫
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 md:min-w-[220px] md:text-right">
                      <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        Tổng thanh toán
                      </p>
                      <p className="mt-1 text-2xl font-black text-blue-700">
                        {Number(inv.totalPayable).toLocaleString('vi-VN')} ₫
                      </p>
                      <span className="mt-1 inline-block text-sm font-extrabold text-slate-600">
                        {invLabels[inv.status] || inv.status}
                      </span>
                    </div>

                    {['PENDING_PAYMENT', 'OVERDUE'].includes(
                      inv.status
                    ) && (
                      <button
                        onClick={() => pay(inv.id)}
                        className="rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0"
                      >
                        Thanh toán ngay
                      </button>
                    )}
                  </div>
                </article>
              ))}

          {((tab === 'transactions' && !transactions.length) ||
            (tab === 'invoices' && !invoices.length)) && (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📄
              </div>
              <div className="mt-4 text-base font-black text-slate-800">
                Chưa có dữ liệu
              </div>
              <div className="mt-1 text-sm font-medium text-slate-500">
                Thông tin sẽ xuất hiện tại đây khi có giao dịch hoặc hóa
                đơn mới.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* POPUP NHẬP LÝ DO HỦY */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.6)]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-black text-slate-900">
                    Yêu cầu hủy giao dịch
                  </div>
                  <div className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    Hãy nêu rõ lý do để đối tác có thể xem xét yêu cầu của
                    bạn.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCancelModal({
                      isOpen: false,
                      id: '',
                      reason: '',
                      sending: false,
                    })
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-100"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={requestCancel} className="p-6">
              <label className="mb-2 block text-sm font-extrabold text-slate-700">
                Lý do hủy giao dịch
              </label>

              <textarea
                rows={5}
                required
                value={cancelModal.reason}
                onChange={(e) =>
                  setCancelModal((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                placeholder="Ví dụ: Sau khi gặp mặt, hai bên không thống nhất được điều kiện giao dịch..."
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-medium leading-6 text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
              />

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={cancelModal.sending}
                  onClick={() =>
                    setCancelModal({
                      isOpen: false,
                      id: '',
                      reason: '',
                      sending: false,
                    })
                  }
                  className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={cancelModal.sending}
                  className="flex-1 rounded-2xl bg-rose-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700 disabled:opacity-60"
                >
                  {cancelModal.sending
                    ? 'Đang gửi...'
                    : 'Gửi yêu cầu hủy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP PHẢN HỒI YÊU CẦU HỦY */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.6)]">
            <div className="p-7 text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl ${
                  actionModal.action === 'agree'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                {actionModal.action === 'agree' ? '✓' : '!'}
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-900">
                {actionModal.action === 'agree'
                  ? 'Đồng ý hủy giao dịch?'
                  : 'Phản đối yêu cầu hủy?'}
              </h3>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {actionModal.action === 'agree'
                  ? 'Giao dịch sẽ được chuyển sang trạng thái hủy theo thỏa thuận của hai bên.'
                  : 'Tranh chấp sẽ được chuyển tới Admin để kiểm tra và đối soát.'}
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <button
                type="button"
                disabled={actionModal.sending}
                onClick={() =>
                  setActionModal({
                    isOpen: false,
                    id: '',
                    action: null,
                    sending: false,
                  })
                }
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-100"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={actionModal.sending}
                onClick={respondCancel}
                className={`flex-1 rounded-2xl py-3.5 text-sm font-extrabold text-white shadow-lg transition-all disabled:opacity-60 ${
                  actionModal.action === 'agree'
                    ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700'
                    : 'bg-rose-600 shadow-rose-500/20 hover:bg-rose-700'
                }`}
              >
                {actionModal.sending
                  ? 'Đang xử lý...'
                  : actionModal.action === 'agree'
                  ? 'Đồng ý hủy'
                  : 'Chuyển Admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
