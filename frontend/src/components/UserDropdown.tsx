'use client';

import React from 'react';
import Link from 'next/link';

export default function UserDropdown({ user, onLogout, onClose }: { user: any; onLogout: () => void; onClose: () => void }) {
  const displayName = user?.fullName || 'Thành viên Nhà Tốt';
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-gray-800 animate-fadeIn">
      
      {/* THÔNG TIN USER */}
      <div className="p-6 text-center bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-100 relative">
        <div className="relative inline-block mx-auto mb-3">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#1877F2] to-blue-400 text-white rounded-full flex items-center justify-center text-3xl font-extrabold shadow-md mx-auto">
            {firstLetter}
          </div>
        </div>

        <h3 className="font-extrabold text-lg text-gray-800 tracking-tight">{displayName}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{user?.email || 'thanhvien@nhatot.com'}</p>

        <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500 font-medium">
          <span>Người theo dõi <strong className="text-gray-800">0</strong></span>
          <span>Đang theo dõi <strong className="text-gray-800">0</strong></span>
        </div>
      </div>

      {/* DANH SÁCH TIỆN ÍCH */}
      <div className="px-3 py-3">
        <div className="text-[11px] font-bold text-gray-400 uppercase px-3 mb-1 tracking-wider">Tiện ích</div>
        
        <div className="space-y-0.5">
          <Link href="/dashboard" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">📊</span>
              <span className="text-sm font-semibold text-gray-700">Quản lý tin đăng</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>

          <Link href="/saved-searches" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🔖</span>
              <span className="text-sm font-semibold text-gray-700">Tìm kiếm đã lưu</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>

          <Link href="/history" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🕒</span>
              <span className="text-sm font-semibold text-gray-700">Lịch sử xem tin</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>

          <Link href="/my-reviews" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">⭐</span>
              <span className="text-sm font-semibold text-gray-700">Đánh giá từ tôi</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>

          <Link href="/area-reviews" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🌳</span>
              <span className="text-sm font-semibold text-gray-700">Đánh giá khu vực</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">Tính năng mới</span>
              <span className="text-gray-300 text-sm">›</span>
            </div>
          </Link>

          {/* MỤC TRỢ GIÚP VÀ LIÊN HỆ */}
          <Link href="/contact" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🎧</span>
              <span className="text-sm font-semibold text-gray-700">Trợ giúp & Liên hệ</span>
            </div>
            <span className="text-gray-300 text-sm">›</span>
          </Link>
        </div>

        {/* ĐĂNG XUẤT */}
        {user && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <button 
              onClick={onLogout}
              className="w-full text-left px-3 py-2.5 rounded-xl text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              🚪 Đăng xuất tài khoản
            </button>
          </div>
        )}

      </div>

    </div>
  );
}