'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../services/api';

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
      let url = `posts?page=${currentPage}&limit=8`;
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
    return <p className="text-center text-gray-500 py-10">Không tìm thấy bài viết phù hợp với tiêu chí lọc.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {posts.map((post: any) => {
          const isFavorited = favoritedIds.includes(post.id);

          return (
            <Link 
              href={`/posts/${post.id}`} 
              key={post.id} 
              className="block bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 overflow-hidden cursor-pointer group relative"
            >
              <button 
                onClick={(e) => handleFavorite(e, post.id)}
                className={`absolute top-3 right-3 z-10 p-2.5 bg-white/90 hover:bg-white rounded-full shadow-md transition-all active:scale-90 ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                title={isFavorited ? "Bỏ lưu" : "Lưu tin này"}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </button>

              <div className="relative h-48 overflow-hidden">
                <img
                  src={post.thumbnail || 'https://via.placeholder.com/400x300'}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 line-clamp-2 group-hover:text-[#1877F2] transition-colors text-sm sm:text-base">
                  {post.title}
                </h3>
                <div className="text-[#1877F2] font-extrabold text-base sm:text-lg mt-2">
                  {Number(post.price || 0).toLocaleString('vi-VN')} VNĐ
                </div>
                <div className="text-gray-400 text-xs sm:text-sm mt-2 flex justify-between items-center pt-2 border-t border-gray-50">
                  <span>📐 {post.area} m²</span>
                  <span className="truncate max-w-[150px]" title={`${post.districts?.name ? post.districts.name + ', ' : ''}${post.cities?.name || post.city || 'Đang cập nhật'}`}>
                    📍 {post.districts?.name && post.cities?.name 
                        ? `${post.districts.name}, ${post.cities.name}` 
                        : post.districts?.name || post.cities?.name || post.city || 'Đang cập nhật'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1 || isLoading}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-all font-medium text-sm"
        >
          Trước
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => setPage(pageNumber)}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl border font-medium text-sm transition-all ${
              pageNumber === page
                ? 'bg-[#1877F2] text-white border-[#1877F2] shadow-md'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {pageNumber}
          </button>
        ))}

        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages || isLoading}
          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-all font-medium text-sm"
        >
          Sau
        </button>
      </div>
    </div>
  );
}