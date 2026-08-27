'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserDropdown from './UserDropdown';
import { apiUrl } from '../services/api';
import { supabase } from '../services/supabase'; 
import UserAvatar from './UserAvatar';

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
  const [user, setUser] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setIsDark(next);
  };
  
  // STATE QUẢN LÝ DROPDOWN
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); 
  
  // STATE QUẢN LÝ DỮ LIỆU
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]); 
  const [unreadCount, setUnreadCount] = useState(0); 
  const [pendingConfirmations, setPendingConfirmations] = useState<any[]>([]);
  const [respondingTransactionId, setRespondingTransactionId] = useState<string | null>(null);

  // 🌟 STATE QUẢN LÝ POPUP CẢNH BÁO TỪ ADMIN
  const [warningPopup, setWarningPopup] = useState<any>(null);
  const [headerToast, setHeaderToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showHeaderToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setHeaderToast({ show: true, message, type });
    window.setTimeout(() => {
      setHeaderToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('access_token'); 
    let warningSyncTimer: number | undefined;
    let syncUnreadWarning: (() => void) | undefined;
    let confirmationSyncTimer: number | undefined;
    let syncPendingConfirmations: (() => void) | undefined;

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      // 1. TẢI DANH SÁCH YÊU THÍCH
      fetch(apiUrl(`posts/favorites/${parsedUser.id}`))
        .then(readJsonSafely)
        .then(data => {
          if (Array.isArray(data)) setFavoritePosts(data);
        })
        .catch(err => console.error('Lỗi tải danh sách yêu thích', err));

      if (token) {
        // 2. TẢI DANH SÁCH THÔNG BÁO THƯỜNG
        fetch(apiUrl('notifications'), {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(readJsonSafely)
        .then(data => {
          if (Array.isArray(data)) {
            // Loại bỏ WARNING_POPUP ra khỏi danh sách thông báo chuông
            const normalNotifs = data.filter((n: any) => n.type !== 'WARNING_POPUP');
            setNotifications(normalNotifs);
            setUnreadCount(normalNotifs.filter((n: any) => !n.isRead && !n.is_read).length);
          }
        })
        .catch(err => console.error('Lỗi tải thông báo', err));

        // 🌟 3. KIỂM TRA CẢNH BÁO CHƯA ĐỌC LÚC MỞ TRANG
        fetch(apiUrl('notifications/unread-warnings'), {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(readJsonSafely)
        .then(data => {
          if (data && data.id) setWarningPopup(data);
        })
        .catch(err => console.error('Lỗi kiểm tra cảnh báo', err));
      }

      // 4. LẮNG NGHE THÔNG BÁO MỚI TỪ SUPABASE (REALTIME)
      if (token) {
        syncUnreadWarning = () => {
          fetch(apiUrl('notifications/unread-warnings'), {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          })
            .then(readJsonSafely)
            .then(data => {
              if (data?.id) setWarningPopup((current: any) => current?.id === data.id ? current : data);
            })
            .catch(err => console.error('Lỗi đồng bộ cảnh báo', err));
        };
        warningSyncTimer = window.setInterval(syncUnreadWarning, 2500);
        window.addEventListener('focus', syncUnreadWarning);

        syncPendingConfirmations = () => {
          fetch(apiUrl('transactions/pending-confirmations'), {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          })
            .then(readJsonSafely)
            .then(data => setPendingConfirmations(Array.isArray(data) ? data : []))
            .catch(err => console.error('Lỗi đồng bộ yêu cầu xác nhận', err));
        };
        syncPendingConfirmations();
        confirmationSyncTimer = window.setInterval(syncPendingConfirmations, 2500);
        window.addEventListener('focus', syncPendingConfirmations);
      }

      const channel = supabase
        .channel(`global_notifications_${parsedUser.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications' 
          }, 
          (payload) => {
            const newNotif = payload.new;
            const notificationUserId = newNotif.user_id ?? newNotif.userId;
            if (String(notificationUserId) === String(parsedUser.id)) {
              
              // 🌟 NẾU LÀ CẢNH BÁO TỪ ADMIN -> BẬT MODAL LÊN NGAY LẬP TỨC
              if (newNotif.type === 'WARNING_POPUP') {
                setWarningPopup(newNotif);
              } 
              // Nếu là thông báo thường -> Thêm vào chuông
              else {
                setNotifications(prev => [newNotif, ...prev]); 
                setUnreadCount(prev => prev + 1); 
                syncPendingConfirmations?.();
              }
            }
          }
        )
        .subscribe();

      return () => {
        if (warningSyncTimer) window.clearInterval(warningSyncTimer);
        if (syncUnreadWarning) window.removeEventListener('focus', syncUnreadWarning);
        if (confirmationSyncTimer) window.clearInterval(confirmationSyncTimer);
        if (syncPendingConfirmations) window.removeEventListener('focus', syncPendingConfirmations);
        supabase.removeChannel(channel);
      };
    }
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener('user-updated', syncUser);
    return () => window.removeEventListener('user-updated', syncUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setShowUserMenu(false);
    setShowFavorites(false);
    setShowNotifications(false);
    setFavoritePosts([]); 
    setNotifications([]);
    setUnreadCount(0);
    setWarningPopup(null);
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
        const res = await fetch(apiUrl(`posts/favorites/${user.id}`));
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
      await fetch(apiUrl(`posts/${postId}/favorite`), {
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

    try {
      await fetch(apiUrl('notifications/read-all'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Lỗi đánh dấu đã đọc', error);
    }
  };

  const handleTransactionResponse = async (transactionId: string, isConfirmed: boolean) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    setRespondingTransactionId(transactionId);
    try {
      const response = await fetch(apiUrl(`transactions/${transactionId}/verify`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isConfirmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Không thể gửi phản hồi giao dịch.');
      setPendingConfirmations(prev => prev.filter(item => item.id !== transactionId));
      showHeaderToast(
        isConfirmed
          ? 'Đã xác nhận giao dịch. Bài đăng đã được đóng.'
          : 'Đã gửi phản hồi không xác nhận. Giao dịch sẽ được chuyển cho admin đối soát.',
        isConfirmed ? 'success' : 'info'
      );
    } catch (error: any) {
      showHeaderToast(error.message || 'Không thể kết nối tới máy chủ.', 'error');
    } finally {
      setRespondingTransactionId(null);
    }
  };

  // 🌟 HÀM XÁC NHẬN ĐÃ ĐỌC CẢNH BÁO TỪ ADMIN
  const handleAcknowledgeWarning = async () => {
    if (!warningPopup) return;
    try {
      const token = localStorage.getItem('access_token');
      await fetch(apiUrl(`notifications/${warningPopup.id}/read`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarningPopup(null); // Tắt Modal
    } catch (err) {
      console.error('Lỗi khi xác nhận cảnh báo', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 text-white shadow-lg shadow-slate-950/10 backdrop-blur-xl">
      <div
        className={`fixed left-1/2 top-24 z-[100000] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 ${
          headerToast.show
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-2xl ${
          headerToast.type === 'error'
            ? 'border-rose-200'
            : headerToast.type === 'success'
            ? 'border-emerald-200'
            : 'border-blue-200'
        }`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-black ${
            headerToast.type === 'error'
              ? 'bg-rose-50 text-rose-600'
              : headerToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-blue-50 text-blue-600'
          }`}>
            {headerToast.type === 'error' ? '!' : headerToast.type === 'success' ? '✓' : 'i'}
          </div>
          <span className="text-sm font-extrabold leading-6 text-slate-700">{headerToast.message}</span>
        </div>
      </div>
      
      {/* ========================================================================= */}
      {/* 🌟 MODAL CẢNH BÁO GIAN LẬN (CHẶN TOÀN MÀN HÌNH - KHÔNG THỂ BẤM RA NGOÀI) */}
      {/* ========================================================================= */}
      {warningPopup && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_30px_100px_-25px_rgba(244,63,94,0.5)] animate-fade-in-up">
            <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-br from-rose-600 to-red-700 p-8 text-center">
              {/* Hiệu ứng nền chớp đỏ */}
              <div className="absolute inset-0 bg-red-600 animate-pulse opacity-50"></div>
              <span className="text-6xl mb-3 relative z-10 drop-shadow-md">🚨</span>
              <h2 className="text-xl font-black text-white uppercase tracking-wider relative z-10 drop-shadow-md">
                {warningPopup.title || 'CẢNH BÁO TỪ BAN QUẢN TRỊ'}
              </h2>
            </div>
            
            <div className="p-8 text-center bg-white">
              <p className="text-gray-800 font-medium text-[15px] leading-relaxed mb-6 whitespace-pre-wrap">
                {warningPopup.content}
              </p>
              
              <div className="bg-rose-50 border border-red-100 rounded-2xl p-5 mb-8 text-left shadow-inner">
                <p className="text-xs text-red-700 font-medium leading-relaxed">
                  <b>* Lưu ý nghiêm trọng:</b> Mọi hành vi cố tình cung cấp thông tin sai lệch, lách luật hoặc trốn tránh phí nền tảng trong quá trình giao dịch sẽ dẫn đến việc tài khoản của bạn bị <b>khóa vĩnh viễn</b> và đưa vào danh sách đen của Nhà Tốt.
                </p>
              </div>

              <button 
                onClick={handleAcknowledgeWarning}
                className="w-full rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase tracking-wide text-white shadow-xl transition-all hover:bg-black active:scale-[0.98]"
              >
                Tôi đã hiểu và cam kết tuân thủ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        
        {/* LOGO */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xl font-black tracking-tighter text-white shadow-lg shadow-blue-500/20">
              NHÀ TỐT
            </div>
            <span className="hidden border-l border-slate-700 pl-3 text-sm font-bold text-slate-300 sm:inline">
              Kênh bất động sản
            </span>
          </Link>
        </div>

        {/* NÚT TÍNH NĂNG BÊN PHẢI */}
        <div className="flex items-center gap-2.5">
          <button onClick={toggleTheme} title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'} aria-label="Đổi chế độ sáng tối" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/10 text-lg text-slate-200 shadow-sm transition hover:rotate-12 hover:bg-white/20">
            {isDark ? '☀️' : '🌙'}
          </button>
          
          {/* ===================== NÚT TRÁI TIM ===================== */}
          <div className="relative">
            <button 
              onClick={toggleFavorites}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all ${
                showFavorites ? 'bg-blue-600 text-white ring-2 ring-blue-400/30' : 'border border-white/10 bg-white/10 text-slate-200 hover:bg-white/15'
              }`} 
              title="Tin đã lưu"
            >
              <svg className="w-5 h-5" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>

              {user && favoritePosts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-[#1877F2] shadow-sm">
                  {favoritePosts.length > 99 ? '99+' : favoritePosts.length}
                </span>
              )}
            </button>

            {showFavorites && (
              <div className="absolute right-0 top-full z-50 mt-3 flex w-96 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3.5">
                  <h3 className="text-sm font-black text-slate-800">Tin đã lưu ({favoritePosts.length})</h3>
                  <button onClick={() => setShowFavorites(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  {isLoadingFavs ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Đang tải dữ liệu...</div>
                  ) : favoritePosts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                      <span className="text-3xl mb-2">💔</span>
                      Bạn chưa lưu tin nào
                    </div>
                  ) : (
                    favoritePosts.map((post) => (
                      <div key={post.id} className="flex group border-b border-gray-50 hover:bg-blue-50 transition-colors items-center pr-3">
                        <Link href={`/posts/${post.id}`} onClick={() => setShowFavorites(false)} className="flex gap-4 p-4 flex-1 min-w-0">
                          <img src={post.thumbnail || 'https://via.placeholder.com/150'} alt={post.title} className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{post.title}</h4>
                            <div className="text-[#1877F2] font-bold text-sm mt-1">{formatPrice(post.price)} VNĐ</div>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium">
                              <span className="truncate">📐 {post.area} m²</span>
                              <span className="truncate max-w-[150px]" title={`${post.districts?.name ? post.districts.name + ', ' : ''}${post.cities?.name || post.city || 'Đang cập nhật'}`}>
                                📍 {post.districts?.name && post.cities?.name 
                                    ? `${post.districts.name}, ${post.cities.name}` 
                                    : post.districts?.name || post.cities?.name || post.city || 'Đang cập nhật'}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <button onClick={(e) => handleRemoveFavorite(e, post.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                showNotifications ? 'bg-blue-600 text-white ring-2 ring-blue-400/30' : 'border border-white/10 bg-white/10 text-slate-200 hover:bg-white/15'
              }`} 
              title="Thông báo"
            >
              <svg className="w-5 h-5" fill={showNotifications ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              
              {user && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] h-5 rounded-full flex items-center justify-center border-2 border-[#1877F2] shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-3 flex w-96 flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white text-slate-800 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3.5">
                  <h3 className="text-sm font-black text-slate-800">Thông báo</h3>
                  <div className="flex items-center gap-4">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead} className="text-[#1877F2] text-xs font-semibold hover:underline">
                        Đánh dấu đã đọc
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">&times;</button>
                  </div>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto">
                  {pendingConfirmations.map((transaction) => (
                    <div key={transaction.id} className="border-b border-blue-100 bg-blue-50/70 p-4">
                      <div className="flex gap-3">
                        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-blue-600 text-lg text-white">✓</div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-gray-900">Yêu cầu xác nhận giao dịch</h4>
                          <p className="mt-1 text-xs leading-relaxed text-gray-600">
                            <strong>{transaction.seller?.fullName || 'Người đăng tin'}</strong> xác nhận đã giao dịch bài “{transaction.post?.title}” với bạn.
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button disabled={respondingTransactionId === transaction.id} onClick={() => handleTransactionResponse(transaction.id, true)} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Xác nhận</button>
                            <button disabled={respondingTransactionId === transaction.id} onClick={() => handleTransactionResponse(transaction.id, false)} className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-50">Không xác nhận</button>
                          </div>
                        </div>
                      </div>
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
                        <div key={notif.id} className={`flex gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${isUnread ? 'bg-blue-50/40' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-[#1877F2]' : 'bg-transparent'}`}></div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-sm ${isUnread ? 'font-bold text-gray-800' : 'font-semibold text-gray-600'}`}>
                              {notif.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{notif.content}</p>
                            <span className="text-[10px] text-gray-400 font-medium mt-2 block">
                              {new Date(notif.created_at || notif.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/chat" className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-slate-200 transition-all hover:bg-white/15 md:flex">
            <svg className="w-4 h-4 text-[#1877F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Liên hệ
          </Link>

          {!user && (
            <Link href="/login" className="rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-white/15">
              Đăng nhập
            </Link>
          )}

          {user && ['AGENT', 'ADMIN'].includes(user.role) ? (
            <Link href="/create-post" className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">
              ĐĂNG TIN
            </Link>
          ) : (
            <button disabled title={user ? 'Nâng cấp tài khoản để đăng tin' : 'Đăng nhập và nâng cấp tài khoản để đăng tin'} className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-extrabold text-slate-500 opacity-80">
              ĐĂNG TIN
            </button>
          )}

          {/* MENU NGƯỜI DÙNG */}
          <div className="relative">
            <button 
              onClick={() => { 
                setShowUserMenu(!showUserMenu); 
                setShowFavorites(false); 
                setShowNotifications(false); 
              }}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-slate-200 transition-all hover:bg-white/15"
            >
              <UserAvatar user={user} className="w-6 h-6" />
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
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

        </div>
      </div>
    </header>
  );
}
