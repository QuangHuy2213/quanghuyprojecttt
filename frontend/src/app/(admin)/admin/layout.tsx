'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import UserAvatar from '@/components/UserAvatar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // 1. Kiểm tra quyền Admin
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (!userStr || !token) {
      router.replace('/login');
      return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
      alert('Bạn không có quyền truy cập vào khu vực này!');
      router.replace('/');
      return;
    }

    setAdminUser(user);
    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1877F2] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold tracking-wide">Đang xác thực hệ thống...</p>
        </div>
      </div>
    );
  }

  // 🌟 CẬP NHẬT: THÊM MỤC QUẢN LÝ GIAO DỊCH VÀO MENU
  const menuItems = [
    { name: 'Tổng quan (Dashboard)', path: '/admin', icon: '📊' },
    { name: 'Quản lý Đối soát', path: '/admin/transactions', icon: '💰' }, // <--- MỚI THÊM VÀO ĐÂY
    { name: 'Quản lý Người dùng', path: '/admin/users', icon: '👥' },
    { name: 'Duyệt bài đăng', path: '/admin/posts', icon: '📝' },
    { name: 'Báo cáo vi phạm', path: '/admin/reports', icon: '🚩' },
    { name: 'Liên hệ & Trợ giúp', path: '/admin/contacts', icon: '💬' },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] font-sans text-gray-800">
      
      {/* ======================= SIDEBAR (THANH BÊN) ======================= */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0 sticky top-0 h-screen z-20">
        <div className="p-8 pb-6 flex flex-col items-center border-b border-gray-50">
          <Link href="/" className="inline-block bg-[#1877F2] text-white font-black text-2xl px-6 py-2 rounded-2xl shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform">
            NHÀ TỐT
          </Link>
          <span className="mt-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full">
            Khu vực quản trị
          </span>
        </div>

        <nav className="flex-1 p-5 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            // Highlight nếu đang ở trang hiện tại (hoặc các trang con của nó)
            const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/admin');
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                  isActive 
                    ? 'bg-blue-50 text-[#1877F2] shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                }`}
              >
                <span className={`text-xl transition-transform ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Nút Đăng xuất ở cuối Sidebar */}
        <div className="p-5 border-t border-gray-50">
          <button 
            onClick={() => {
              localStorage.clear();
              router.push('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ======================= NỘI DUNG CHÍNH ======================= */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* HEADER CỦA ADMIN */}
        <header className="bg-white/70 backdrop-blur-xl px-10 py-5 flex items-center justify-between sticky top-0 z-10 border-b border-gray-100/50">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">
              {menuItems.find(m => isActivePath(pathname, m.path))?.name || 'Quản trị hệ thống'}
            </h2>
            <div className="text-sm text-gray-500 font-medium mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Hệ thống đang hoạt động ổn định
            </div>
          </div>

          {/* AVATAR ADMIN */}
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-sm border border-gray-100">
            <UserAvatar user={adminUser} className="w-10 h-10 border-2 border-[#1877F2]/20" />
            <div className="text-right hidden md:block">
              <div className="text-sm font-extrabold text-gray-800">{adminUser?.fullName}</div>
              <div className="text-[10px] font-bold text-[#1877F2] uppercase tracking-wider">Quản trị viên</div>
            </div>
          </div>
        </header>

        {/* KHU VỰC RENDER TRANG CON */}
        <div className="p-10">
          {children}
        </div>
      </main>
      
    </div>
  );
}

// Hàm phụ trợ để hiển thị đúng tiêu đề Header
function isActivePath(currentPath: string, menuPath: string) {
  if (menuPath === '/admin') return currentPath === '/admin';
  return currentPath.startsWith(menuPath);
}
