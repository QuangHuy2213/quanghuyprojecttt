'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header'; // Điều chỉnh lại đường dẫn Header nếu cần
import { apiUrl } from '../../../services/api';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (id) {
      // 1. Tự động ghi nhận vào lịch sử xem tin (cho trang /history)
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

  // MÀN HÌNH LOADING HIỆN ĐẠI
  if (isLoading) return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
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
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
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

  return (
    <div className="min-h-screen bg-[#f4f7f6] relative overflow-hidden">
      
      {/* 🌟 CSS ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
      `}} />

      <Header />
      
      {/* 🌟 POPUP TOAST HIỆN ĐẠI */}
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

      <main className="max-w-5xl mx-auto px-4 py-8 animate-fade-in-up relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ================= CỘT TRÁI: HÌNH ẢNH VÀ CHI TIẾT ================= */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Ảnh cover có hiệu ứng Zoom khi Hover */}
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 group">
              <img 
                src={post.thumbnail || 'https://via.placeholder.com/800x400?text=Nha+Tot'} 
                alt={post.title} 
                className="w-full h-[400px] object-cover transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
              />
            </div>

            {/* Thông tin chính */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-4 leading-tight">{post.title}</h1>
              <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-5">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#1877F2] to-blue-500 font-extrabold text-3xl sm:text-4xl">
                  {formatPrice(post.price)}
                </span>
                <span className="text-gray-600 font-bold bg-blue-50/50 border border-blue-100 px-4 py-1.5 rounded-full text-sm flex items-center gap-1.5 shadow-sm">
                  <span className="text-[#1877F2]">📐</span> {post.area} m²
                </span>
              </div>
              <div className="text-sm text-gray-600 flex items-start gap-2.5 font-medium bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                <span className="text-lg">📍</span>
                <span className="leading-relaxed">
                  {post.addressDetail ? `${post.addressDetail}, ` : ''} 
                  {post.ward ? `${post.ward}, ` : ''} 
                  {post.districts?.name}, {post.cities?.name}
                </span>
              </div>
            </div>

            {/* Thông số & Đặc điểm */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
              <h2 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-[#1877F2]">📋</span> Đặc điểm bất động sản
              </h2>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                <div className="flex flex-col p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Diện tích</span>
                  <span className="font-extrabold text-gray-800 text-base">{post.area} m²</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Số phòng ngủ</span>
                  <span className="font-extrabold text-gray-800 text-base">{post.bedrooms || '--'} phòng</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Số phòng tắm</span>
                  <span className="font-extrabold text-gray-800 text-base">{post.bathrooms || '--'} phòng</span>
                </div>
                <div className="flex flex-col p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                  <span className="text-gray-400 font-semibold text-[11px] uppercase tracking-wider mb-1">Pháp lý</span>
                  <span className="font-extrabold text-[#1877F2] text-base">{post.legalDocument || 'Đang cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
              <h2 className="font-extrabold text-xl text-gray-800 mb-6 flex items-center gap-2">
                <span className="text-[#1877F2]">📝</span> Mô tả chi tiết
              </h2>
              <div className="text-[15px] text-gray-700 whitespace-pre-wrap leading-relaxed font-medium bg-gray-50/30 p-5 rounded-2xl">
                {post.content}
              </div>
            </div>
          </div>

          {/* ================= CỘT PHẢI: THÔNG TIN NGƯỜI BÁN ================= */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 sticky top-28">
              
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#1877F2] to-blue-400 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
                    {post.user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-lg tracking-tight">{post.user?.fullName || 'Người dùng'}</h3>
                  <span className="inline-block text-[11px] text-[#1877F2] bg-blue-50 font-bold px-3 py-1 rounded-full mt-1 border border-blue-100">
                    {post.user?.role === 'AGENT' ? 'BẠN MÔI GIỚI' : 'NGƯỜI BÁN CÁ NHÂN'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* 1. NÚT GỌI ĐIỆN */}
                <a 
                  href={`tel:${post.user?.phoneNumber || '0901234567'}`}
                  className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98] transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span className="tracking-wide">{post.user?.phoneNumber || '0901234567'}</span>
                </a>
                
                {/* 2. NÚT CHAT */}
                <button 
                  onClick={() => {
                    const currentUser = localStorage.getItem('user');
                    if (!currentUser) {
                      // GỌI POPUP THAY VÌ DÙNG ALERT
                      showToast('Vui lòng đăng nhập để chat với người bán!', 'error');
                      setTimeout(() => {
                        router.push('/login');
                      }, 2000);
                      return;
                    }
                    const sellerId = post.user?.id || 'unknown';
                    const sellerName = encodeURIComponent(post.user?.fullName || 'Người bán');
                    
                    router.push(`/chat?sellerId=${sellerId}&sellerName=${sellerName}&postId=${post.id}`);
                  }} 
                  className="w-full bg-white border-2 border-[#1877F2] text-[#1877F2] hover:bg-blue-50 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] transform hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Chat với người bán
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}