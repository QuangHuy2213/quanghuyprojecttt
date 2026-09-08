'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useInbox } from '@/components/InboxProvider';
import { useTransactions } from '@/components/TransactionProvider';
import { mergeRows } from '@/services/transaction-state';
import { transactionLabels } from '@/components/TransactionPrompt';
import { apiFetch } from '@/services/api';
import { startPolling } from '@/services/polling';

type Listing = {
  id: number;
  title: string;
  thumbnail?: string;
  price: string;
  status: string;
  approvedAt?: string;
  createdAt: string;
  transactions: {
    id: string;
    status: string;
    buyer: { fullName: string; phoneNumber?: string };
  }[];
};

export default function DashboardPage() {
  const { user, token } = useInbox();
  const { setTransactions } = useTransactions();
  const [posts, setPosts] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [soldPost, setSoldPost] = useState<Listing | null>(null);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (id: string, signal?: AbortSignal) => {
    const response = await apiFetch(`posts/user/${id}`, { signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể tải tin đăng.');
    if (!signal?.aborted) {
      setPosts(data);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      setPosts([]);
      return;
    }
    const poller = startPolling(async (signal) => {
      try {
        await load(user.id, signal);
      } catch (error) {
        if (!signal.aborted) {
          setMessage(error instanceof Error ? error.message : 'Không thể tải tin.');
          setLoading(false);
        }
      }
    });
    window.addEventListener('transactions-updated', poller.refresh);
    return () => {
      poller.stop();
      window.removeEventListener('transactions-updated', poller.refresh);
    };
  }, [user?.id, token]);

  const mutate = async (path: string, method: string, body: object) => {
    const response = await apiFetch(path, { method, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể thực hiện thao tác.');
    return data;
  };

  const changeStatus = async (post: Listing) => {
    setBusy(true);
    try {
      await mutate(`posts/${post.id}`, 'PATCH', {
        status: post.status === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE',
      });
      await load(user!.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Không thể thay đổi trạng thái.',
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (post: Listing) => {
    if (!window.confirm(`Xóa tin “${post.title}”?`)) return;
    setBusy(true);
    try {
      await mutate(`posts/${post.id}/delete`, 'POST', {});
      await load(user!.id);
      setMessage('Đã xóa tin.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xóa tin.');
    } finally {
      setBusy(false);
    }
  };

  const markSold = async (event: FormEvent) => {
    event.preventDefault();
    if (!soldPost) return;
    setBusy(true);
    try {
      const result = await mutate(`transactions/posts/${soldPost.id}/mark-sold`, 'POST', { buyerPhone });
      setTransactions(current => mergeRows(current, [result.data || result]));
      setSoldPost(null);
      setMessage(
        'Đã gửi yêu cầu tới khách hàng. Tin chưa chuyển sang đã bán cho tới khi khách xác nhận.',
      );
      await load(user!.id);
      window.dispatchEvent(new Event('transactions-updated'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể báo đã bán.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quản lý tin đăng</h1>
            <p className="mt-2 text-sm text-slate-500">
              Theo dõi duyệt tin, thỏa thuận và xác nhận đã bán.
            </p>
          </div>
          {user && ['AGENT', 'ADMIN'].includes(user.role || '') && (
            <Link
              href="/create-post"
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white"
            >
              Đăng tin mới
            </Link>
          )}
        </div>
        {message && (
          <div
            role="status"
            className="mb-4 flex justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm"
          >
            <p>{message}</p>
            <button aria-label="Đóng" onClick={() => setMessage('')}>
              ×
            </button>
          </div>
        )}
        {!user ? (
          <Link href="/login" className="text-blue-600">
            Đăng nhập để quản lý tin
          </Link>
        ) : loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="space-y-3">
            {!posts.length && (
              <p className="rounded-xl bg-white p-8 text-center text-slate-500">
                Bạn chưa có tin đăng.
              </p>
            )}
            {posts.map((post) => {
              const reservation = post.transactions[0];
              const locked = !!reservation || post.status === 'SOLD';
              const label = reservation
                ? transactionLabels[reservation.status]
                : {
                    ACTIVE: 'Đang hiển thị',
                    PENDING: 'Chờ duyệt',
                    HIDDEN: post.approvedAt ? 'Đang ẩn' : 'Chưa được duyệt',
                    SOLD: 'Đã bán',
                  }[post.status] || post.status;
              return (
                <article
                  key={post.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5
                    sm:flex-row sm:items-center"
                >
                  {post.thumbnail && (
                    <img
                      src={post.thumbnail}
                      alt=""
                      className="h-24 w-32 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/posts/${post.id}`}
                      className="font-bold text-slate-900 hover:text-blue-600"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {Number(post.price).toLocaleString('vi-VN')} VNĐ
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {label}
                      {reservation ? ` · ${reservation.buyer.fullName}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm font-semibold">
                    {reservation && (
                      <Link
                        href="/my-transactions"
                        className="rounded-lg border px-3 py-2 text-blue-700"
                      >
                        Xem giao dịch
                      </Link>
                    )}
                    {(post.status === 'ACTIVE' ||
                      reservation?.status === 'NEGOTIATING') && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          setSoldPost(post);
                          setBuyerPhone(reservation?.buyer.phoneNumber || '');
                        }}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
                      >
                        Đã bán
                      </button>
                    )}
                    {!locked && (
                      <>
                        {post.approvedAt && (
                          <button
                            disabled={busy}
                            onClick={() => changeStatus(post)}
                            className="rounded-lg border px-3 py-2"
                          >
                            {post.status === 'ACTIVE' ? 'Ẩn tin' : 'Hiện tin'}
                          </button>
                        )}
                        <Link
                          href={`/dashboard/edit/${post.id}`}
                          className="rounded-lg border px-3 py-2"
                        >
                          Chỉnh sửa
                        </Link>
                        <button
                          disabled={busy}
                          onClick={() => remove(post)}
                          className="rounded-lg border px-3 py-2 text-rose-600"
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      {soldPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={markSold}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mark-sold-title"
            className="w-full max-w-md rounded-2xl bg-white p-6"
          >
            <h2 id="mark-sold-title" className="text-xl font-bold">
              Báo đã bán
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              Nhập số điện thoại tài khoản khách hàng. Hệ thống sẽ gửi yêu cầu xác nhận;
              chỉ khi khách đồng ý mới tạo hóa đơn nháp cho admin.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Số điện thoại khách hàng
              <input
                required
                pattern="0[0-9]{9}"
                maxLength={10}
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(event.target.value.replace(/\D/g, ''))}
                readOnly={!!soldPost.transactions[0]?.buyer.phoneNumber}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setSoldPost(null)}
                className="rounded-xl border px-4 py-2"
              >
                Đóng
              </button>
              <button
                disabled={busy}
                className="rounded-xl bg-blue-600 px-4 py-2 text-white"
              >
                {busy ? 'Đang gửi...' : 'Gửi xác nhận'}
              </button>
            </div>
            {message && (
              <p role="alert" className="mt-3 text-sm text-rose-700">
                {message}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
