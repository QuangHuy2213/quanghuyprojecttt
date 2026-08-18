'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UserDropdown from './UserDropdown';
import { apiUrl } from '../services/api';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [showFavorites, setShowFavorites] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [favoritePosts, setFavoritePosts] = useState<any[]>([]);
  const [isLoadingFavs, setIsLoadingFavs] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    setShowUserMenu(false);
    router.push('/');
  };

  const formatPrice = (price: any) => {
    if (!price) return 'Đang cập nhật';
    return Number(price).toLocaleString('vi-VN');
  };

  const toggleFavorites = async () => {
    setShowUserMenu(false);
    if (!user) {
      alert('Vui lòng đăng nhập để xem danh sách đã lưu!');
      router.push('/login');
      return;
    }

    const willShow = !showFavorites;
    setShowFavorites(willShow);

    if (willShow) {
      setIsLoadingFavs(true);
      try {
        const res = await fetch(apiUrl(`posts/favorites/${user.id}`));
        const data = await res.json();
        setFavoritePosts(data);
      } catch (error) {
        console.error('Lỗi tải danh sách yêu thích', error);
      } finally {
        setIsLoadingFavs(false);
      }
    }
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

  return (
    <header className="bg-[#1877F2] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-white text-[#1877F2] font-extrabold text-2xl px-3.5 py-1 rounded-full tracking-tighter shadow-sm">
              NHÀ TỐT
            </div>
            <span className="hidden sm:inline text-sm font-semibold border-l border-blue-400 pl-2 opacity-90">
              Kênh môi giới
            </span>
          </Link>
        </div>

        {/* NÚT TÍNH NĂNG BÊN PHẢI */}
        <div className="flex items-center gap-2.5">
          
          {/* NÚT TRÁI TIM (Tin đã lưu) */}
          <div className="relative">
            <button 
              onClick={toggleFavorites}
              className={`flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all ${
                showFavorites ? 'bg-white text-[#1877F2] ring-2 ring-white/50' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`} 
              title="Tin đã lưu"
            >
              <svg className="w-5 h-5" fill={showFavorites ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {showFavorites && (
              <div className="absolute top-full right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 flex flex-col z-50">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-700">Tin đã lưu ({favoritePosts.length})</h3>
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

          {/* NÚT THÔNG BÁO */}
          <button className="flex items-center justify-center w-10 h-10 bg-white text-gray-700 hover:bg-gray-100 rounded-full shadow-sm transition-all" title="Thông báo">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>

         {/* NÚT LIÊN HỆ / QUẢN LÝ CHAT */}
          <Link href="/chat" className="hidden md:flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-full shadow-sm text-sm font-semibold transition-all">
            <svg className="w-4 h-4 text-[#1877F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Liên hệ
          </Link>

          {/* ĐĂNG NHẬP (nếu chưa có user) */}
          {!user && (
            <Link href="/login" className="bg-white text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-full shadow-sm text-sm font-semibold transition-all">
              Đăng nhập
            </Link>
          )}

          {/* NÚT ĐĂNG TIN */}
          <Link href="/create-post" className="bg-[#222222] hover:bg-black text-white text-sm font-bold px-5 py-2 rounded-full shadow-md transition-all">
            ĐĂNG TIN
          </Link>

          {/* MENU NGƯỜI DÙNG */}
          <div className="relative">
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowFavorites(false); }}
              className="flex items-center gap-2 bg-white text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-full shadow-sm transition-all"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
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