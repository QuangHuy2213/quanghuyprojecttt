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

export default function PostList({ filters }: { filters: { keyword: string; city: string; district: string; price: string; area: string; transactionType?: string } }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [favoritedIds, setFavoritedIds] = useState<number[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

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
      if (filters.transactionType) url += `&transactionType=${filters.transactionType}`;

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
      showToast('Vui lòng đăng nhập để lưu tin.', 'error');
      return;
    }

    const isAlreadyFavorited = favoritedIds.includes(postId);
    if (isAlreadyFavorited) {
      setFavoritedIds(prev => prev.filter(id => id !== postId));
      showToast('Đã bỏ tin khỏi danh sách đã lưu.');
    } else {
      setFavoritedIds(prev => [...prev, postId]);
      showToast('Đã lưu tin vào danh sách yêu thích.');
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
    return (
      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">⌕</div>
        <div className="mt-4 text-base font-black text-slate-800">Không tìm thấy bất động sản phù hợp</div>
        <div className="mt-1 text-sm font-medium text-slate-500">Hãy thử thay đổi khu vực, mức giá hoặc diện tích.</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className={`fixed left-1/2 top-24 z-[100] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-300 ${
          toast.show
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-2xl ${
          toast.type === 'error' ? 'border-rose-200' : 'border-emerald-200'
        }`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-black ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            {toast.type === 'error' ? '!' : '✓'}
          </div>
          <span className="text-sm font-extrabold text-slate-700">{toast.message}</span>
        </div>
      </div>

      {isLoading && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          Đang cập nhật danh sách bất động sản...
        </div>
      )}

      {/* KHUNG GRID */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {posts.map((post: any) => {
          const isFavorited = favoritedIds.includes(post.id);

          return (
            <Link 
              href={`/posts/${post.id}`} 
              key={post.id} 
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >
              {/* Ảnh bìa */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <span className={`absolute left-2 top-2 z-10 rounded-xl px-2.5 py-1.5 text-[11px] font-black tracking-wide text-white shadow-sm ${post.transactionType === 'RENT' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{post.transactionType === 'RENT' ? 'CHO THUÊ' : 'MUA BÁN'}</span>
                {/* ĐÃ XÓA NHÃN "MUA BÁN" Ở ĐÂY */}

                {/* Nút thả tim */}
                <button 
                  onClick={(e) => handleFavorite(e, post.id)}
                  className={`absolute right-2.5 top-2.5 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-slate-950/35 text-white shadow-lg backdrop-blur-md transition-all hover:bg-slate-950/55 active:scale-90 ${isFavorited ? 'border-rose-100 bg-white text-rose-500 hover:bg-white' : ''}`}
                  title={isFavorited ? "Bỏ lưu" : "Lưu tin này"}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorited ? "0" : "2"} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                  </svg>
                </button>

                <img
                  src={post.thumbnail || 'https://via.placeholder.com/400x300?text=No+Image'}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              {/* Thông tin chi tiết */}
              <div className="flex flex-grow flex-col p-4">
                {/* Tiêu đề */}
                <h3 className="mb-3 line-clamp-2 min-h-[48px] text-[15px] font-black leading-6 text-slate-900 transition-colors group-hover:text-blue-700" title={post.title}>
                  {post.title}
                </h3>
                
                {/* Giá và Diện tích */}
                <div className="mt-auto flex flex-wrap items-baseline gap-2">
                  <span className="whitespace-nowrap text-lg font-black text-rose-600">
                    {formatPrice(post.price)}
                  </span>
                  {post.area && (
                    <span className="text-sm font-bold text-slate-500 before:mr-2 before:content-['•']">
                      {Number(post.area)} m²
                    </span>
                  )}
                </div>

                {/* 🌟 HIỂN THỊ TRỰC TIẾP TÊN THẬT CỦA NGƯỜI ĐĂNG 🌟 */}
                <div className="mt-3 flex items-center text-sm font-semibold text-slate-600">
                  <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  <span className="truncate">{post.sellerName || post.user?.fullName || 'Người dùng'}</span>
                </div>

                {/* VỊ TRÍ */}
                <div className="mt-3 flex items-center border-t border-slate-100 pt-3 text-sm text-slate-500">
                  <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
  
                  <span 
                    className="truncate font-semibold text-slate-500"
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
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40"
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              disabled={isLoading}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-extrabold transition-all ${
                pageNumber === page
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages || isLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
