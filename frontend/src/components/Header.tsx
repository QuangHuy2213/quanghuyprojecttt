'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserDropdown from './UserDropdown';
import { apiFetch, clearApiCache } from '../services/api';
import { useTransactions } from './TransactionProvider';
import { mergeRows, pendingConfirmation } from '@/services/transaction-state';
import { useInbox } from './InboxProvider';
import TransactionPrompt from './TransactionPrompt';
import UserAvatar from './UserAvatar';
import { formatNotificationTime } from '@/services/timestamps';

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('API trả về dữ liệu không đúng định dạng JSON.');
  }
}

export default function Header() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme');

    const applyTheme = (dark: boolean) => {
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
      setIsDark(dark);
    };

    // Ưu tiên lựa chọn người dùng đã lưu.
    // Nếu chưa từng chọn, dùng theme hệ điều hành.
    const initialDark =
      savedTheme === 'dark'
        ? true
        : savedTheme === 'light'
          ? false
          : window.matchMedia('(prefers-color-scheme: dark)').matches;

    applyTheme(initialDark);

    // Đồng bộ nếu theme bị đổi từ tab khác.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'theme') return;
      applyTheme(event.newValue === 'dark');
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.contains('dark');

    root.classList.toggle('dark', next);
    root.style.colorScheme = next ? 'dark' : 'light';
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);

    // Cho component nào cần lắng nghe theme có thể cập nhật ngay.
    window.dispatchEvent(
      new CustomEvent('theme-changed', {
        detail: { theme: next ? 'dark' : 'light' },
      }),
    );
  };

  // STATE QUẢN LÝ DROPDOWN
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // STATE QUẢN LÝ DỮ LIỆU
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);
  const {
    user,
    token,
    notifications: allNotifications,
    setNotifications,
    unreadMessages,
  } = useInbox();
  const notifications = allNotifications.filter(
    (item) => item.type !== 'WARNING_POPUP' && item.type !== 'MESSAGE',
  );
  const unreadCount = notifications.filter(
    (item) => !item.isRead && !item.is_read,
  ).length;

  const { transactions, setTransactions } = useTransactions();
  const pendingConfirmations = transactions.filter(row => pendingConfirmation(row, user?.id || ''));

  const [headerToast, setHeaderToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showHeaderToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
  ) => {
    setHeaderToast({ show: true, message, type });
    window.setTimeout(() => {
      setHeaderToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    setFavoritePosts([]);

    if (!user?.id || !token) return;
    const userId = user.id;
    const controller = new AbortController();
    apiFetch(`posts/favorites/${userId}`, { signal: controller.signal })
      .then(readJsonSafely)
      .then((data) => {
        if (!controller.signal.aborted && Array.isArray(data)) setFavoritePosts(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) console.error('Lỗi tải danh sách yêu thích', err);
      });


    return () => {
      controller.abort();

    };
  }, [user?.id, token]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    clearApiCache();
    window.dispatchEvent(new Event('user-updated'));

    setShowUserMenu(false);
    setShowFavorites(false);
    setShowNotifications(false);
    setFavoritePosts([]);

    router.push('/');
  };

  const formatPrice = (price: any) => {
    if (!price) return 'Đang cập nhật';
    return Number(price).toLocaleString('vi-VN');
  };

  const toggleFavorites = async () => {
    setShowUserMenu(false);
    setShowNotifications(false);
    if (!user) {
      showHeaderToast('Vui lòng đăng nhập để xem danh sách đã lưu.', 'error');
      router.push('/login');
      return;
    }

    const willShow = !showFavorites;
    setShowFavorites(willShow);

    if (willShow) {
      setIsLoadingFavs(true);
      try {
        const res = await apiFetch(`posts/favorites/${user.id}`);
        const data = await readJsonSafely(res);
        if (Array.isArray(data)) setFavoritePosts(data);
      } catch (error) {
        console.error('Lỗi tải danh sách yêu thích', error);
      } finally {
        setIsLoadingFavs(false);
      }
    }
  };

  const toggleNotifications = () => {
    setShowUserMenu(false);
    setShowFavorites(false);
    if (!user) {
      showHeaderToast('Vui lòng đăng nhập để xem thông báo.', 'error');
      router.push('/login');
      return;
    }
    setShowNotifications(!showNotifications);
  };

  const handleRemoveFavorite = async (e: React.MouseEvent, postId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) return;
    setFavoritePosts((prev) => prev.filter((post) => post.id !== postId));
    window.dispatchEvent(new CustomEvent('favoriteRemoved', { detail: { postId } }));

    try {
      await apiFetch(`posts/${postId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    } catch (error) {
      console.error('Lỗi khi xóa tin đã lưu:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const viewedIds = new Set(notifications.map(item => item.id));

    try {
      const response = await apiFetch('notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      await readJsonSafely(response);
      setNotifications((prev) =>
        prev.map((n) =>
          !viewedIds.has(n.id) ? n : { ...n, isRead: true, is_read: true },
        ),
      );
    } catch (error) {
      console.error('Lỗi đánh dấu đã đọc', error);
    }
  };


  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-900 shadow-lg shadow-slate-900/5 backdrop-blur-xl transition-colors duration-300 dark:border-white/10 dark:bg-slate-950/95 dark:text-white dark:shadow-black/20">
      <div
        className={`fixed left-1/2 top-24 z-[100000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 ${
          headerToast.show
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div
          className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-2xl transition-colors dark:bg-slate-900 ${
            headerToast.type === 'error'
              ? 'border-rose-200'
              : headerToast.type === 'success'
                ? 'border-emerald-200'
                : 'border-blue-200'
          }`}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl font-black ${
              headerToast.type === 'error'
                ? 'bg-rose-50 text-rose-600'
                : headerToast.type === 'success'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-blue-50 text-blue-600'
            }`}
          >
            {headerToast.type === 'error'
              ? '!'
              : headerToast.type === 'success'
                ? '✓'
                : 'i'}
          </div>
          <span className="text-sm font-extrabold leading-6 text-slate-700 dark:text-slate-200">
            {headerToast.message}
          </span>
        </div>
      </div>



      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        {/* LOGO */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xl font-black tracking-tighter text-white shadow-lg shadow-blue-500/20">
              NHÀ TỐT
            </div>
            <span className="hidden border-l border-slate-200 pl-3 text-sm font-bold text-slate-600 transition-colors sm:inline dark:border-slate-700 dark:text-slate-300">
              Kênh bất động sản
            </span>
          </Link>
        </div>

        {/* NÚT TÍNH NĂNG BÊN PHẢI */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            aria-label="Đổi chế độ sáng tối"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200
              bg-slate-50 text-lg text-slate-700 shadow-sm transition hover:rotate-12
              hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200
              dark:hover:bg-white/20"
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          {/* ===================== NÚT TRÁI TIM ===================== */}
          <div className="relative">
            <button
              onClick={toggleFavorites}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all ${
                showFavorites
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
              }`}
              title="Tin đã lưu"
            >
              <svg
                className="w-5 h-5"
                fill={showFavorites ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>

              {user && favoritePosts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-[#1877F2] shadow-sm">
                  {favoritePosts.length > 99 ? '99+' : favoritePosts.length}
                </span>
              )}
            </button>

            {showFavorites && (
              <div className="absolute right-0 top-full z-50 mt-3 flex w-96 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-800 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3.5 transition-colors dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Tin đã lưu ({favoritePosts.length})
                  </h3>
                  <button
                    onClick={() => setShowFavorites(false)}
                    className="text-slate-400 hover:text-red-500 text-2xl leading-none dark:text-slate-500 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {isLoadingFavs ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Đang tải dữ liệu...
                    </div>
                  ) : favoritePosts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                      <span className="text-3xl mb-2">💔</span>
                      Bạn chưa lưu tin nào
                    </div>
                  ) : (
                    favoritePosts.map((post) => (
                      <div
                        key={post.id}
                        className="flex group border-b border-gray-50 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/10
                          transition-colors items-center pr-3"
                      >
                        <Link
                          href={`/posts/${post.id}`}
                          onClick={() => setShowFavorites(false)}
                          className="flex gap-4 p-4 flex-1 min-w-0"
                        >
                          <img
                            src={post.thumbnail || 'https://via.placeholder.com/150'}
                            alt={post.title}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
                              {post.title}
                            </h4>
                            <div className="text-[#1877F2] font-bold text-sm mt-1">
                              {formatPrice(post.price)} VNĐ
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium">
                              <span className="truncate">📐 {post.area} m²</span>
                              <span
                                className="truncate max-w-[150px]"
                                title={`${post.districts?.name ? post.districts.name + ', ' : ''}${post.cities?.name || post.city || 'Đang cập nhật'}`}
                              >
                                📍{' '}
                                {post.districts?.name && post.cities?.name
                                  ? `${post.districts.name}, ${post.cities.name}`
                                  : post.districts?.name ||
                                    post.cities?.name ||
                                    post.city ||
                                    'Đang cập nhật'}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <button
                          onClick={(e) => handleRemoveFavorite(e, post.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50
                            rounded-full transition-all"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ===================== NÚT THÔNG BÁO ===================== */}
          <div className="relative">
            <button
              onClick={toggleNotifications}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all ${
                showNotifications
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400/30'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
              }`}
              title="Thông báo"
            >
              <svg
                className="w-5 h-5"
                fill={showNotifications ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>

              {user && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-[#1877F2] shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-3 flex w-96 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-800 shadow-2xl transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3.5 transition-colors dark:border-slate-700 dark:bg-slate-800">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Thông báo</h3>
                  <div className="flex items-center gap-4">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[#1877F2] text-xs font-semibold hover:underline"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-red-500 text-2xl leading-none dark:text-slate-500 dark:hover:text-red-400"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {pendingConfirmations.map((transaction) => (
                    <div key={transaction.id} className="p-3">
                      <TransactionPrompt
                        transaction={transaction}
                        userId={user?.id || ''}
                        onUpdated={(row) => setTransactions(current => mergeRows(current, [row]))}
                      />
                    </div>
                  ))}
                  {notifications.length === 0 && pendingConfirmations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                      <span className="text-3xl mb-2">🔕</span>
                      Bạn chưa có thông báo nào
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isUnread = !notif.isRead && !notif.is_read;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => { if (notif.link) router.push(notif.link); }}
                          className={`flex gap-3 p-4 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/40' : ''}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-[#1877F2]' : 'bg-transparent'}`}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`text-sm ${isUnread ? 'font-bold text-gray-800' : 'font-semibold text-gray-600'}`}
                            >
                              {notif.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                              {notif.content}
                            </p>
                            <span className="text-[10px] text-gray-400 font-medium mt-2 block">
                              {formatNotificationTime(
                                notif.created_at || notif.createdAt || '',
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4
              py-2.5 text-sm font-extrabold text-slate-700 transition-all
              hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-slate-200
              dark:hover:bg-white/15 md:flex"
          >
            <svg
              className="w-4 h-4 text-[#1877F2]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            Tin nhắn
            {unreadMessages > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>

          {!user && (
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm
                font-extrabold text-slate-800 transition-all hover:bg-slate-100
                dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Đăng nhập
            </Link>
          )}

          {user && ['AGENT', 'ADMIN'].includes(user.role || '') ? (
            <Link
              href="/create-post"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5
                text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all
                hover:-translate-y-0.5"
            >
              ĐĂNG TIN
            </Link>
          ) : (
            <button
              disabled
              title={
                user
                  ? 'Nâng cấp tài khoản để đăng tin'
                  : 'Đăng nhập và nâng cấp tài khoản để đăng tin'
              }
              className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5
                py-2.5 text-sm font-extrabold text-slate-400 opacity-80
                dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
            >
              ĐĂNG TIN
            </button>
          )}

          {/* MENU NGƯỜI DÙNG */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowFavorites(false);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50
                  px-3 py-2 text-slate-700 transition-all hover:bg-slate-100
                  dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
              >
                <UserAvatar user={user} className="w-6 h-6" />
                <svg
                  className="w-4 h-4 text-slate-500 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showUserMenu && (
                <UserDropdown
                  user={user}
                  onLogout={handleLogout}
                  onClose={() => setShowUserMenu(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
