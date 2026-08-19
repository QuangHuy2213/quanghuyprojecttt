'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../services/api';

// --- Hàm format giá tiền ---
const formatPrice = (price: any) => {
  if (!price) return 'Thỏa thuận';
  const numPrice = Number(price);
  
  if (numPrice >= 1000000000) {
    const ty = numPrice / 1000000000;
    return ty % 1 === 0 ? `${ty} Tỷ` : `${ty.toFixed(2).replace('.', ',')} Tỷ`;
  }
  if (numPrice >= 1000000) {
    const trieu = numPrice / 1000000;
    return trieu % 1 === 0 ? `${trieu} Triệu` : `${trieu.toFixed(2).replace('.', ',')} Triệu`;
  }
  return `${numPrice.toLocaleString('vi-VN')} Đ`;
};

export default function PostList({ filters }: { filters: { keyword: string; city: string; district: string; price: string; area: string } }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [favoritedIds, setFavoritedIds] = useState<number[]>([]);

  useEffect(() => {
    const handleFavoriteRemoved = (event: any) => {
      const removedPostId = event.detail.postId;
      setFavoritedIds((prev) => prev.filter(id => id !== removedPostId));
    };
    window.addEventListener('favoriteRemoved', handleFavoriteRemoved);
    return () => window.removeEventListener('favoriteRemoved', handleFavoriteRemoved);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchUserFavorites(parsedUser.id);
    }
  }, []);

  const fetchUserFavorites = async (userId: string) => {
    try {
      const res = await fetch(apiUrl(`posts/favorites/${userId}`));
      const data = await res.json();
      if (Array.isArray(data)) {
        setFavoritedIds(data.map((post: any) => post.id));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tim:', err);
    }
  };

  const fetchPosts = async (currentPage: number) => {
    setIsLoading(true);
    try {
      let url = `posts?page=${currentPage}&limit=12`;
      if (filters.city) url += `&city=${filters.city}`;
      if (filters.district) url += `&district=${filters.district}`;
      if (filters.keyword) url += `&keyword=${filters.keyword}`;
      if (filters.price) url += `&price=${filters.price}`;
      if (filters.area) url += `&area=${filters.area}`;

      const res = await fetch(apiUrl(url));
      const result = await res.json();

      const dataArray = result?.data ?? (Array.isArray(result) ? result : []);
      setPosts(dataArray);
      setTotalPages(result?.totalPages || 1);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      setPosts([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    fetchPosts(1);
  }, [filters]);

  useEffect(() => {
    fetchPosts(page);
  }, [page]);

  const handleFavorite = async (e: React.MouseEvent, postId: number) => {
    e.preventDefault(); 
    if (!user || !user.id) {
      alert('Vui lòng đăng nhập để lưu tin nhé!');
      return;
    }

    const isAlreadyFavorited = favoritedIds.includes(postId);
    if (isAlreadyFavorited) {
      setFavoritedIds(prev => prev.filter(id => id !== postId));
    } else {
      setFavoritedIds(prev => [...prev, postId]);
    }

    try {
      await fetch(apiUrl(`posts/${postId}/favorite`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
    } catch (err) {
      console.error('Lỗi khi lưu tin:', err);
    }
  };

  if ((!posts || posts.length === 0) && !isLoading) {
    return <div className="text-center text-gray-500 py-20 font-medium">Không tìm thấy bài viết phù hợp với tiêu chí lọc.</div>;
  }

  return (
    <div>
      {/* KHUNG GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {posts.map((post: any) => {
          const isFavorited = favoritedIds.includes(post.id);

          return (
            <Link 
              href={`/posts/${post.id}`} 
              key={post.id} 
              className="flex flex-col bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer group relative"
            >
              {/* Ảnh bìa */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                {/* ĐÃ XÓA NHÃN "MUA BÁN" Ở ĐÂY */}

                {/* Nút thả tim */}
                <button 
                  onClick={(e) => handleFavorite(e, post.id)}
                  className={`absolute top-2 right-2 z-10 p-2 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full transition-all active:scale-90 ${isFavorited ? 'text-red-500 bg-white/90 hover:bg-white' : 'text-white'}`}
                  title={isFavorited ? "Bỏ lưu" : "Lưu tin này"}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorited ? "0" : "2"} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </button>

                <img
                  src={post.thumbnail || 'https://via.placeholder.com/400x300?text=No+Image'}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Thông tin chi tiết */}
              <div className="p-3 sm:p-4 flex flex-col flex-grow">
                {/* Tiêu đề */}
                <h3 className="font-medium text-gray-800 line-clamp-2 leading-snug mb-2 group-hover:text-[#1877F2] transition-colors text-sm sm:text-[15px]" title={post.title}>
                  {post.title}
                </h3>
                
                {/* Giá và Diện tích */}
                <div className="mt-auto flex items-baseline gap-2">
                  <span className="text-red-500 font-bold text-sm sm:text-base whitespace-nowrap">
                    {formatPrice(post.price)}
                  </span>
                  {post.area && (
                    <span className="text-[11px] sm:text-xs text-gray-500 font-medium before:content-['•'] before:mr-1.5 sm:before:mr-2">
                      {Number(post.area)} m²
                    </span>
                  )}
                </div>

                {/* 🌟 HIỂN THỊ TRỰC TIẾP TÊN THẬT CỦA NGƯỜI ĐĂNG 🌟 */}
                <div className="text-gray-500 text-[11px] sm:text-xs mt-1.5 flex items-center font-medium">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <span className="truncate">{post.sellerName || post.user?.fullName || 'Người dùng'}</span>
                </div>

                {/* VỊ TRÍ */}
                <div className="text-gray-400 text-[11px] sm:text-xs mt-1.5 pt-2 border-t border-gray-100 flex items-center">
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  
                  <span 
                    className="truncate font-medium text-gray-500" 
                    title={[post.addressDetail, post.districts?.name, post.cities?.name].filter(Boolean).join(', ')}
                  >
                  {/* Hàm filter(Boolean).join(', ') sẽ tự động nối các thông tin lại bằng dấu phẩy, cái nào trống nó sẽ tự động bỏ qua */}
                  {[post.addressDetail, post.districts?.name, post.cities?.name].filter(Boolean).join(', ') || 'Đang cập nhật'}
                  </span>
                  </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* PHÂN TRANG */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-12 flex-wrap">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || isLoading}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-all font-medium text-xs sm:text-sm"
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              disabled={isLoading}
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl border font-medium text-xs sm:text-sm transition-all ${
                pageNumber === page
                  ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-md shadow-blue-500/20'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages || isLoading}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-all font-medium text-xs sm:text-sm"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}