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

  // HÀM TẮT/BẬT TRẠNG THÁI HIỂN THỊ CỦA CÔNG TẮC
  const handleToggleStatus = async (postId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'HIDDEN' ? 'ACTIVE' : 'HIDDEN';

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

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-medium">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* TIÊU ĐỀ & NÚT ĐĂNG TIN */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Quản lý tin đăng</h1>
            <p className="text-gray-500 mt-1.5 text-sm sm:text-base">
              Bạn đang có tổng cộng <span className="font-bold text-[#1877F2]">{myPosts.length}</span> tin trên hệ thống.
            </p>
          </div>
          <Link 
            href="/create-post" 
            className="bg-[#1877F2] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95 text-sm sm:text-base whitespace-nowrap"
          >
            <span className="text-lg leading-none">+</span> Đăng tin mới
          </Link>
        </div>

        {myPosts.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-extrabold text-gray-800 mb-2">Bạn chưa đăng tin nào</h2>
            <p className="text-gray-500 mb-6 text-sm sm:text-base">Hãy khởi tạo bài đăng đầu tiên của bạn để tiếp cận hàng triệu khách hàng.</p>
            <Link href="/create-post" className="inline-block bg-[#1877F2] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all">
              Tiến hành đăng tin ngay
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-5 bg-gray-50 font-bold text-gray-600 text-xs uppercase tracking-wider border-b border-gray-200">
              <div className="col-span-6 md:col-span-5">Thông tin bài đăng</div>
              <div className="hidden md:block col-span-3 text-center">Mức giá</div>
              <div className="col-span-3 md:col-span-2 text-center">Trạng thái</div>
              <div className="col-span-3 md:col-span-2 text-center">Thao tác</div>
            </div>

            {myPosts.map((post) => {
              const isVisible = post.status !== 'HIDDEN';

              return (
                <div key={post.id} className={`grid grid-cols-12 gap-4 p-5 border-b border-gray-100 items-center transition-colors ${isVisible ? 'hover:bg-blue-50/20' : 'bg-gray-50/80 opacity-75'}`}>
                  
                  <div className="col-span-6 md:col-span-5 flex gap-4 items-center">
                    <img 
                      src={post.thumbnail || 'https://via.placeholder.com/150'} 
                      alt={post.title} 
                      className={`w-20 h-20 object-cover rounded-2xl border border-gray-200 flex-shrink-0 shadow-sm ${!isVisible && 'grayscale'}`} 
                    />
                    <div>
                      <Link href={`/posts/${post.id}`} className="font-bold text-gray-800 line-clamp-2 hover:text-[#1877F2] transition-colors text-sm sm:text-base">
                        {post.title}
                      </Link>
                      <div className="text-xs text-gray-400 mt-1">Mã tin: #{post.id}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Ngày đăng: {new Date(post.createdAt).toLocaleDateString('vi-VN')}</div>
                    </div>
                  </div>

                  <div className="hidden md:block col-span-3 text-center font-extrabold text-[#1877F2]">
                    {Number(post.price || 0).toLocaleString('vi-VN')} VNĐ
                  </div>

                  {/* CÔNG TẮC TOGGLE TRẠNG THÁI */}
                  <div className="col-span-3 md:col-span-2 flex flex-col items-center justify-center gap-1.5">
                    <button
                      onClick={() => handleToggleStatus(post.id, post.status)}
                      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        isVisible ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                      title={isVisible ? 'Bấm để ẩn tin' : 'Bấm để hiện tin'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                          isVisible ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-[11px] font-bold ${isVisible ? 'text-green-600' : 'text-gray-500'}`}>
                      {isVisible ? 'Đang hiển thị' : 'Đã ẩn'}
                    </span>
                  </div>

                  {/* THAO TÁC SỬA / XÓA */}
                  <div className="col-span-3 md:col-span-2 flex justify-center gap-2">
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