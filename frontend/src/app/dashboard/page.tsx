'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soldPost, setSoldPost] = useState<any>(null);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isSubmittingSold, setIsSubmittingSold] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Vui lòng đăng nhập để vào trang quản lý!');
      router.push('/login');
    } else {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMyPosts(parsedUser.id);
    }
  }, [router]);

  const fetchMyPosts = async (userId: string) => {
    try {
      const res = await fetch(apiUrl(`posts/user/${userId}`));
      const data = await res.json();
      setMyPosts(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách tin của bạn:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: number, postTitle: string) => {
    const isConfirm = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng: "${postTitle}" không?`);
    if (!isConfirm) return;

    try {
      await fetch(apiUrl(`posts/${postId}/delete`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      setMyPosts(prev => prev.filter(post => post.id !== postId));
      alert('Đã xóa bài viết thành công!');
    } catch (err) {
      console.error('Lỗi khi xóa bài:', err);
      alert('Có lỗi xảy ra khi xóa bài!');
    }
  };

  // HÀM ĐỔI TRẠNG THÁI (BẬT/TẮT HOẶC ĐÃ BÁN)
  const handleUpdateStatus = async (postId: number, newStatus: string) => {
    // Cập nhật giao diện ngay lập tức
    setMyPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, status: newStatus } : post
    ));

    // Gọi API lưu xuống Database
    try {
      await fetch(apiUrl(`posts/${postId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus })
      });
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái:', err);
    }
  };

  const handleMarkSold = async () => {
    if (!soldPost || !/^0\d{9}$/.test(buyerPhone)) {
      alert('Vui lòng nhập số điện thoại khách hàng gồm 10 số, bắt đầu bằng 0.');
      return;
    }
    setIsSubmittingSold(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`transactions/posts/${soldPost.id}/mark-sold`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ buyerPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể gửi yêu cầu xác nhận.');
      alert('Đã gửi thông báo xác nhận tới khách hàng. Tin sẽ chuyển sang Đã bán khi khách xác nhận.');
      setSoldPost(null);
      setBuyerPhone('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmittingSold(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1877F2]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Header />

      {soldPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-xl font-black text-gray-900">Xác nhận đã giao dịch</h2>
            <p className="mt-2 text-sm text-gray-500">Nhập số điện thoại tài khoản khách mua. Hệ thống sẽ gửi yêu cầu để khách xác nhận trước khi đóng tin và tạo hóa đơn nháp.</p>
            <input
              autoFocus
              inputMode="numeric"
              maxLength={10}
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="Ví dụ: 0912345678"
              className="mt-5 w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
            <div className="mt-5 flex gap-3">
              <button onClick={() => { setSoldPost(null); setBuyerPhone(''); }} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600">Hủy</button>
              <button disabled={isSubmittingSold} onClick={handleMarkSold} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                {isSubmittingSold ? 'Đang gửi...' : 'Gửi xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* TIÊU ĐỀ & NÚT ĐĂNG TIN */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Quản lý tin đăng</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Bạn đang có tổng cộng <span className="font-extrabold text-[#1877F2]">{myPosts.length}</span> tin trên hệ thống.
            </p>
          </div>
          <Link 
            href="/create-post" 
            className="bg-[#1877F2] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <span className="text-lg leading-none">+</span> Đăng tin mới
          </Link>
        </div>

        {myPosts.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2">Bạn chưa đăng tin nào</h2>
            <p className="text-gray-500 mb-6 text-sm">Hãy khởi tạo bài đăng đầu tiên của bạn để tiếp cận hàng triệu khách hàng.</p>
            <Link href="/create-post" className="inline-block bg-[#1877F2] text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-600 transition-all text-sm">
              Tiến hành đăng tin ngay
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-5 bg-gray-50/70 font-bold text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-100">
              <div className="col-span-6 md:col-span-5">Thông tin bài đăng</div>
              <div className="hidden md:block col-span-2 text-center">Mức giá</div>
              <div className="col-span-3 md:col-span-3 text-center">Trạng thái & Kiểm duyệt</div>
              <div className="col-span-3 md:col-span-2 text-center">Thao tác</div>
            </div>

            {myPosts.map((post) => {
              const status = post.status; // ACTIVE, HIDDEN, PENDING, REJECTED, SOLD
              const isVisible = status === 'ACTIVE';
              const isPending = status === 'PENDING';
              const isRejected = status === 'REJECTED'; // Giả định trạng thái bị từ chối từ admin
              const isSold = status === 'SOLD';

              // Kiểm tra xem có bị khóa nút bật/tắt không (Ví dụ: Đang chờ duyệt hoặc bị từ chối)
              const isToggleDisabled = isPending || isRejected;

              return (
                <div key={post.id} className="grid grid-cols-12 gap-4 p-5 border-b border-gray-50 items-center hover:bg-gray-50/50 transition-colors">
                  
                  {/* THÔNG TIN BÀI ĐĂNG (Đã xóa mã tin) */}
                  <div className="col-span-6 md:col-span-5 flex gap-4 items-center">
                    <img 
                      src={post.thumbnail || 'https://via.placeholder.com/150'} 
                      alt={post.title} 
                      className="w-20 h-20 object-cover rounded-2xl border border-gray-100 flex-shrink-0 shadow-sm" 
                    />
                    <div className="min-w-0">
                      <Link href={`/posts/${post.id}`} className="font-bold text-gray-800 line-clamp-2 hover:text-[#1877F2] transition-colors text-sm">
                        {post.title}
                      </Link>
                      <div className="text-[11px] text-gray-400 mt-1.5 font-medium">
                        Ngày đăng: {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  {/* MỨC GIÁ */}
                  <div className="hidden md:block col-span-2 text-center font-extrabold text-[#1877F2] text-sm font-mono">
                    {Number(post.price || 0).toLocaleString('vi-VN')} VNĐ
                  </div>

                  {/* TRẠNG THÁI & CÔNG TẮC BẬT TẮT (BỊ KHÓA NẾU BỊ ADMIN TỪ CHỐI / CHỜ DUYỆT) */}
                  <div className="col-span-3 md:col-span-3 flex flex-col items-center justify-center gap-2">
                    {isRejected ? (
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black rounded-xl border border-rose-100 mb-1">
                          BỊ TỪ CHỐI
                        </span>
                        <span className="text-[10px] text-gray-400 italic">Admin không duyệt</span>
                      </div>
                    ) : isPending ? (
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-xl border border-amber-100 mb-1">
                          ĐANG CHỜ DUYỆT
                        </span>
                        <span className="text-[10px] text-gray-400 italic">Chờ Admin kiểm duyệt</span>
                      </div>
                    ) : isSold ? (
                      <div className="flex flex-col items-center">
                        <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-xl border border-purple-100 mb-1">
                          ĐÃ BÁN
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          disabled={isToggleDisabled}
                          onClick={() => handleUpdateStatus(post.id, isVisible ? 'HIDDEN' : 'ACTIVE')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                            isVisible ? 'bg-emerald-500' : 'bg-gray-300'
                          }`}
                          title={isVisible ? 'Bấm để ẩn tin' : 'Bấm để hiện tin'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                              isVisible ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-xs font-bold ${isVisible ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {isVisible ? 'Hiển thị' : 'Đã ẩn'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* THAO TÁC (SỬA, XÓA, ĐÃ BÁN) */}
                  <div className="col-span-3 md:col-span-2 flex justify-center items-center gap-1.5">
                    {/* Nút đánh dấu Đã bán / Mở lại */}
                    {!isPending && !isRejected && (
                      <button
                        onClick={() => isSold ? handleUpdateStatus(post.id, 'ACTIVE') : setSoldPost(post)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isSold 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={isSold ? 'Mở lại tin bán' : 'Đánh dấu đã bán'}
                      >
                        {isSold ? 'Mở bán' : 'Đã bán'}
                      </button>
                    )}

                    <Link 
                      href={`/dashboard/edit/${post.id}`}
                      className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all shadow-sm" 
                      title="Sửa tin"
                    >
                      ✏️
                    </Link>
                    <button 
                      onClick={() => handleDelete(post.id, post.title)}
                      className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all shadow-sm" 
                      title="Xóa tin"
                    >
                      🗑️
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
