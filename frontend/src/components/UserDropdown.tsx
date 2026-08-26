'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../services/api';
import UserAvatar from './UserAvatar';

export default function UserDropdown({ user, onLogout, onClose }: { user: any; onLogout: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State bật/tắt modal xác nhận
  const [toastMessage, setToastMessage] = useState<string | null>(null); // State hiển thị thông báo kết quả
  
  const displayName = user?.fullName || 'Thành viên Nhà Tốt';

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setToastMessage('❌ Phiên đăng nhập không tồn tại, vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }
      
      // Gọi API khởi tạo thanh toán VNPAY
      const res = await fetch(apiUrl('payments/upgrade-agent'), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        // Chuyển hướng người dùng sang trang thanh toán của VNPAY
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          setToastMessage('❌ Lỗi hệ thống: Không lấy được đường dẫn thanh toán.');
          setLoading(false);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Lỗi từ server:", errData);
        setToastMessage('❌ Khởi tạo thanh toán thất bại, vui lòng đăng nhập lại.');
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi kết nối:", error);
      setToastMessage('❌ Không thể kết nối đến máy chủ.');
      setLoading(false);
    } finally {
      setShowConfirmModal(false);
    }
  };

  return (
    <>
      {/* TOAST THÔNG BÁO KẾT QUẢ HIỆN ĐẠI */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] bg-gray-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-white/20 text-xs font-bold animate-bounce flex items-center gap-3">
          <span>✨</span> {toastMessage}
        </div>
      )}

      {/* MODAL XÁC NHẬN NÂNG CẤP ĐẸP MẮT */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
              ⭐
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Nâng cấp tài khoản Môi giới?</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Mở khóa tính năng đăng tin không giới hạn với gói <strong className="text-amber-600">299.000 VNĐ / 3 tháng</strong>. Thanh toán an toàn qua cổng VNPAY.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleUpgrade}
                disabled={loading}
                className="py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-orange-500/25 transition-all"
              >
                {loading ? 'Đang kết nối...' : 'Thanh toán ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-gray-800 animate-fadeIn">
        
        {/* THÔNG TIN USER */}
        <div className="p-6 text-center bg-gradient-to-b from-blue-50/50 to-white border-b border-gray-100 relative">
          <div className="relative inline-block mx-auto mb-3">
            <UserAvatar user={user} className="w-20 h-20 shadow-md mx-auto" />
          </div>

          <h3 className="font-extrabold text-lg text-gray-800 tracking-tight">{displayName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{user?.email || 'thanhvien@nhatot.com'}</p>

          <div className="mt-2">
            <span className={`text-[10px] font-black px-3 py-1 rounded-full border inline-block ${
              user?.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-200' :
              user?.role === 'AGENT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
              'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              Vai trò: {user?.role || 'USER'}
            </span>
          </div>

          {/* NÚT KÍCH HOẠT MODAL NÂNG CẤP */}
          {user && user.role === 'USER' && (
            <button 
              onClick={() => setShowConfirmModal(true)}
              className="w-full mt-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs hover:from-amber-600 hover:to-orange-600 transition-all shadow-md shadow-orange-500/25 flex items-center justify-center gap-2"
            >
              <span>⭐</span> Nâng cấp lên Môi giới
            </button>
          )}

          <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500 font-medium">
            <span>Người theo dõi <strong className="text-gray-800">0</strong></span>
            <span>Đang theo dõi <strong className="text-gray-800">0</strong></span>
          </div>
        </div>

        {/* DANH SÁCH TIỆN ÍCH */}
        <div className="px-3 py-3">
          <div className="text-[11px] font-bold text-gray-400 uppercase px-3 mb-1 tracking-wider">Tiện ích</div>
          
          <div className="space-y-0.5">
            {/* 🌟 MỤC MỚI: LỊCH SỬ GIAO DỊCH */}
            <Link href="/my-transactions" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🤝</span>
                <span className="text-sm font-semibold text-gray-700">Lịch sử giao dịch</span>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>

            <Link href="/dashboard" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">📊</span>
                <span className="text-sm font-semibold text-gray-700">Quản lý tin đăng</span>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>

            <Link href="/settings" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3"><span>⚙️</span><span className="text-sm font-semibold text-gray-700">Cài đặt tài khoản</span></div><span className="text-gray-300">›</span>
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

            <Link href="/contact" onClick={onClose} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 group-hover:text-[#1877F2] transition-colors">🎧</span>
                <span className="text-sm font-semibold text-gray-700">Trợ giúp & Liên hệ</span>
              </div>
              <span className="text-gray-300 text-sm">›</span>
            </Link>
          </div>

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
    </>
  );
}
