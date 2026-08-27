'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function HistoryPage() {
  const [historyPosts, setHistoryPosts] = useState<any[]>([]);

  useEffect(() => {
    const historyIds = JSON.parse(localStorage.getItem('viewed_posts') || '[]');
    if (historyIds.length > 0) {
      Promise.all(
        historyIds.map((id: number) => 
          fetch(apiUrl(`posts/${id}`)).then(res => res.json()).catch(() => null)
        )
      ).then(data => setHistoryPosts(data.filter(Boolean)));
    }
  }, []);

  const handleClearHistory = () => {
    localStorage.removeItem('viewed_posts');
    setHistoryPosts([]);
  };

  return (
    <div className="user-page-shell min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Lịch sử xem tin</h1>
              <p className="text-gray-500 text-sm mt-1">Các bất động sản bạn đã xem gần đây.</p>
            </div>
            {historyPosts.length > 0 && (
              <button onClick={handleClearHistory} className="text-red-600 bg-red-50 hover:bg-red-100 font-bold px-4 py-2 rounded-xl text-xs transition-all">
                Xóa lịch sử
              </button>
            )}
          </div>

          {historyPosts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-5xl mb-3 block">🕒</span>
              <p className="text-sm">Bạn chưa xem bất kỳ tin nào.</p>
              <Link href="/" className="inline-block mt-4 bg-[#1877F2] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all text-sm">
                Xem danh sách nhà đất
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {historyPosts.map((post) => (
                <Link href={`/posts/${post.id}`} key={post.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-blue-50/40 transition-colors items-center">
                  <img src={post.thumbnail || 'https://via.placeholder.com/150'} alt={post.title} className="w-20 h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base line-clamp-1">{post.title}</h3>
                    <div className="text-[#1877F2] font-extrabold text-sm mt-1">{Number(post.price || 0).toLocaleString('vi-VN')} VNĐ</div>
                    
                    {/* BỔ SUNG ĐẦY ĐỦ DIỆN TÍCH VÀ ĐỊA CHỈ */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1.5 font-medium">
                      <span>📐 {post.area} m²</span>
                      <span className="truncate" title={`${post.districts?.name ? post.districts.name + ', ' : ''}${post.cities?.name || post.city || 'Đang cập nhật'}`}>
                        📍 {post.districts?.name && post.cities?.name 
                            ? `${post.districts.name}, ${post.cities.name}` 
                            : post.districts?.name || post.cities?.name || post.city || 'Đang cập nhật'}
                      </span>
                    </div>

                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
