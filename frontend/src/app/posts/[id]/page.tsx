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

  if (isLoading) return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex items-center justify-center text-gray-500 font-medium">Đang tải thông tin...</div>;
  if (!post) return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex items-center justify-center text-gray-500 font-medium">Không tìm thấy bài viết!</div>;

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Thoả thuận';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toLocaleString('vi-VN')} tỷ`;
    return `${(price / 1_000_000).toLocaleString('vi-VN')} triệu`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* CỘT TRÁI: Hình ảnh và Chi tiết */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ảnh cover */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
              <img 
                src={post.thumbnail || 'https://via.placeholder.com/800x400?text=Nha+Tot'} 
                alt={post.title} 
                className="w-full h-[400px] object-cover"
              />
            </div>

            {/* Thông tin chính */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-3">{post.title}</h1>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <span className="text-[#1877F2] font-extrabold text-2xl sm:text-3xl">{formatPrice(post.price)}</span>
                <span className="text-gray-500 font-bold bg-blue-50 text-[#1877F2] px-3 py-1 rounded-full text-sm">📐 {post.area} m²</span>
              </div>
              <div className="text-sm text-gray-600 flex items-start gap-2 font-medium">
                <span>📍</span>
                <span>
                  {post.addressDetail ? `${post.addressDetail}, ` : ''} 
                  {post.ward ? `${post.ward}, ` : ''} 
                  {post.districts?.name}, {post.cities?.name}
                </span>
              </div>
            </div>

            {/* Thông số & Đặc điểm */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <h2 className="font-extrabold text-lg text-gray-800 mb-4">Đặc điểm bất động sản</h2>
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div className="flex flex-col"><span className="text-gray-400 font-medium text-xs uppercase">Diện tích</span><span className="font-bold text-gray-800 mt-0.5">{post.area} m²</span></div>
                <div className="flex flex-col"><span className="text-gray-400 font-medium text-xs uppercase">Số phòng ngủ</span><span className="font-bold text-gray-800 mt-0.5">{post.bedrooms || '--'} phòng</span></div>
                <div className="flex flex-col"><span className="text-gray-400 font-medium text-xs uppercase">Số phòng tắm</span><span className="font-bold text-gray-800 mt-0.5">{post.bathrooms || '--'} phòng</span></div>
                <div className="flex flex-col"><span className="text-gray-400 font-medium text-xs uppercase">Pháp lý</span><span className="font-bold text-gray-800 mt-0.5">{post.legalDocument || 'Đang cập nhật'}</span></div>
              </div>
            </div>

            {/* Mô tả chi tiết */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100">
              <h2 className="font-extrabold text-lg text-gray-800 mb-4">Mô tả chi tiết</h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Thông tin người bán */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 sticky top-24">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center font-extrabold text-xl shadow-sm">
                  {post.user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-base">{post.user?.fullName || 'Người dùng'}</h3>
                  <span className="inline-block text-xs text-[#1877F2] bg-blue-50 font-bold px-2.5 py-0.5 rounded-full mt-1">
                    {post.user?.role === 'AGENT' ? 'Môi giới' : 'Cá nhân'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* 1. NÚT GỌI ĐIỆN: Bấm vào mở trình gọi điện */}
                <a 
                  href={`tel:${post.user?.phoneNumber || '0901234567'}`}
                  className="w-full bg-[#00aa00] hover:bg-[#009000] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99]"
                >
                  <span>📞</span> 
                  {post.user?.phoneNumber || '0901234567'}
                </a>
                
                {/* 2. NÚT CHAT */}
                <button 
                  onClick={() => {
                    const currentUser = localStorage.getItem('user');
                    if (!currentUser) {
                      alert('Vui lòng đăng nhập để chat với người bán!');
                      router.push('/login');
                      return;
                    }
                    const sellerId = post.user?.id || 'unknown';
                    const sellerName = encodeURIComponent(post.user?.fullName || 'Người bán');
                    
                    // Chuyển sang trang chat và truyền tên + ID lên URL
                    router.push(`/chat?sellerId=${sellerId}&sellerName=${sellerName}&postId=${post.id}`);
                  }} 
                  className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
                >
                  <span>💬</span> Chat với người bán
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}