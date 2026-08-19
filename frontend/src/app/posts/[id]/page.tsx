'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header'; 
import { apiUrl } from '../../../services/api';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // STATE QUẢN LÝ POPUP (TOAST NOTIFICATION)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    // Lấy user hiện tại để kiểm tra quyền sở hữu
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    if (id) {
      // 1. Tự động ghi nhận vào lịch sử xem tin
      const viewedPosts = JSON.parse(localStorage.getItem('viewed_posts') || '[]');
      const updatedHistory = [Number(id), ...viewedPosts.filter((item: number) => item !== Number(id))].slice(0, 20);
      localStorage.setItem('viewed_posts', JSON.stringify(updatedHistory));

      // 2. Lấy dữ liệu bài viết từ API
      fetch(apiUrl(`posts/${id}`))
        .then(res => res.json())
        .then(data => {
          setPost(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Lỗi:", err);
          setIsLoading(false);
        });
    }
  }, [id]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Thoả thuận';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toLocaleString('vi-VN')} tỷ`;
    return `${(price / 1_000_000).toLocaleString('vi-VN')} triệu`;
  };

  // MÀN HÌNH LOADING
  if (isLoading) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-[#1877F2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-[#1877F2] font-bold animate-pulse text-lg tracking-wide">Đang tải thông tin...</span>
        </div>
      </div>
    </div>
  );

  // MÀN HÌNH LỖI KHÔNG TÌM THẤY BÀI VIẾT
  if (!post) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center max-w-sm">
          <span className="text-6xl block mb-4">🔍</span>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy bài viết!</h2>
          <p className="text-gray-500 text-sm mb-6">Bài viết này có thể đã bị xóa hoặc không tồn tại.</p>
          <button onClick={() => router.push('/')} className="bg-[#1877F2] text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-600 transition-colors">Về trang chủ</button>
        </div>
      </div>
    </div>
  );

  // Biến lưu tên hiển thị thống nhất
  const displaySellerName = post.sellerName || post.user?.fullName || 'Người bán';
  // Kiểm tra xem người đang xem có phải chủ bài đăng không
  const isOwner = currentUser && String(currentUser.id) === String(post.user?.id || post.userId);

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
      `}} />

      <Header />
      
      {/* POPUP TOAST */}
      <div 
        className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${
          toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'
        }`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in-up relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CỘT TRÁI: HÌNH ẢNH VÀ CHI TIẾT */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 group">
              <img 
                src={post.thumbnail || 'https://via.placeholder.com/600x400?text=No+Image'} 
                alt={post.title} 
                className="w-full h-[420px] object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4 leading-tight">{post.title}</h1>
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6 mb-6">
                <span className="text-red-500 font-extrabold text-3xl sm:text-4xl tracking-tight">
                  {formatPrice(post.price)}
                </span>
                <span className="text-gray-700 font-bold bg-gray-100 px-4 py-2 rounded-2xl text-sm flex items-center gap-2">
                  <span className="text-[#1877F2]">📐</span> Diện tích: <strong className="text-gray-900">{post.area} m²</strong>
                </span>
              </div>

              <div className="text-sm text-gray-600 flex items-start gap-3 font-medium bg-blue-50/40 p-4 rounded-2xl border border-blue-50/60">
                <span className="text-xl">📍</span>
                <span className="leading-relaxed text-gray-700">
                  {post.addressDetail ? `${post.addressDetail}, ` : ''} 
                  {post.ward ? `${post.ward}, ` : ''} 
                  {post.districts?.name}, {post.cities?.name}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="font-extrabold text-lg text-gray-900 mb-5 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-sm font-bold">📋</span> 
                Đặc điểm bất động sản
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100/80">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Diện tích</span>
                  <span className="font-bold text-gray-900 text-base">{post.area} m²</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100/80">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Phòng ngủ</span>
                  <span className="font-bold text-gray-900 text-base">{post.bedrooms || '--'} phòng</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100/80">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Phòng tắm</span>
                  <span className="font-bold text-gray-900 text-base">{post.bathrooms || '--'} phòng</span>
                </div>
                <div className="flex flex-col p-4 bg-gray-50 rounded-2xl border border-gray-100/80">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Pháp lý</span>
                  <span className="font-bold text-[#1877F2] text-sm truncate">{post.legalDocument || 'Đang cập nhật'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
              <h2 className="font-extrabold text-lg text-gray-900 mb-5 flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#1877F2] flex items-center justify-center text-sm font-bold">📝</span> 
                Mô tả chi tiết
              </h2>
              <div className="text-[15px] text-gray-700 whitespace-pre-wrap leading-relaxed font-normal bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                {post.content}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN NGƯỜI BÁN */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-28 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1877F2] to-blue-400 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {displaySellerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-gray-900 text-base truncate">{displaySellerName}</h3>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#1877F2] bg-blue-50 font-semibold px-2.5 py-0.5 rounded-full mt-1">
                    🟢 {post.user?.role === 'AGENT' ? 'Môi giới' : 'Người bán'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {!isOwner ? (
                  <>
                    <a 
                      href={`tel:${post.phone || post.user?.phoneNumber || '0901234567'}`}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98]"
                    >
                      <span>{post.phone || post.user?.phoneNumber || '0901234567'}</span>
                    </a>
                    <button 
                      onClick={() => {
                        if (!currentUser) {
                          showToast('Vui lòng đăng nhập để chat!', 'error');
                          return router.push('/login');
                        }
                        const sellerId = post.user?.id || post.userId;
                        router.push(`/chat?sellerId=${sellerId}&sellerName=${encodeURIComponent(displaySellerName)}&postId=${post.id}`);
                      }} 
                      className="w-full bg-white border border-gray-200 text-[#1877F2] hover:bg-blue-50/50 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.98]"
                    >
                      Chat với {displaySellerName}
                    </button>
                  </>
                ) : (
                  <div className="text-center text-gray-500 italic py-4 bg-gray-50 rounded-2xl">
                    Đây là tin đăng của bạn
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}