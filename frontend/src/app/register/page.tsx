'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // 1. STATE QUẢN LÝ POPUP (TOAST NOTIFICATION)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Hàm hiển thị Popup tự động tắt sau 3 giây
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // 2. HÀM CHẶN NHẬP KÝ TỰ LẠ VÀO SỐ ĐIỆN THOẠI
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Dùng Regex thay thế mọi ký tự không phải là số (0-9) thành chuỗi rỗng
    const onlyNums = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, phoneNumber: onlyNums });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 3. KIỂM TRA LOGIC SỐ ĐIỆN THOẠI (Bắt đầu bằng số 0 và đúng 10 số)
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(formData.phoneNumber)) {
      showToast('Số điện thoại không hợp lệ! Vui lòng nhập 10 số và bắt đầu bằng số 0.', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        // 4. KIỂM TRA LỖI TRÙNG EMAIL TỪ BACKEND
        if (data.message && data.message.toLowerCase().includes('email')) {
          showToast('Email này đã được đăng ký! Vui lòng sử dụng email khác.', 'error');
        } else {
          showToast(data.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại!', 'error');
        }
      } else {
        // Thông báo thành công và delay 2s để người dùng kịp đọc trước khi chuyển trang
        showToast(data.message || 'Đăng ký thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ. Vui lòng thử lại sau!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* ================= GIAO DIỆN POPUP (TOAST) TƯƠNG TÁC MƯỢT MÀ ================= */}
      <div 
        className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</span>
          {toast.message}
        </div>
      </div>
      {/* ============================================================================== */}

      {/* Khung lớn max-w-lg như thiết kế của bạn */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-12 px-8 shadow-2xl rounded-3xl border border-gray-100 sm:px-12">
          
          {/* LOGO & TIÊU ĐỀ */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block bg-[#1877F2] text-white font-extrabold text-xl sm:text-2xl px-6 py-2.5 rounded-full shadow-md tracking-tight hover:opacity-95 transition-opacity">
              NHÀ TỐT
            </Link>
            <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-800">
              Tạo tài khoản mới
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Đăng ký ngay để trải nghiệm đầy đủ tính năng của Nhà Tốt
            </p>
          </div>

          {/* FORM ĐĂNG KÝ */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* HỌ VÀ TÊN */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Họ và tên</label>
              <input 
                required 
                type="text" 
                placeholder="Nguyễn Văn A"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.fullName} 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Email</label>
              <input 
                required 
                type="email" 
                placeholder="nhapemail@gmail.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* SỐ ĐIỆN THOẠI */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Số điện thoại</label>
              <input 
                required 
                type="tel" // Thay type="text" bằng type="tel" để bàn phím điện thoại tối ưu hơn
                maxLength={10} // Bắt buộc giới hạn 10 ký tự
                placeholder="0912345678"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.phoneNumber} 
                onChange={handlePhoneChange} // Xử lý chặn chữ cái
              />
            </div>

            {/* MẬT KHẨU */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mật khẩu</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {/* NÚT SUBMIT */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full mt-3 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-[#1877F2] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng ký ngay'}
            </button>
          </form>

          {/* CHUYỂN SANG ĐĂNG NHẬP */}
          <div className="mt-8 text-center text-sm sm:text-base border-t border-gray-100 pt-6">
            <span className="text-gray-500">Đã có tài khoản? </span>
            <Link href="/login" className="font-bold text-[#1877F2] hover:underline">
              Đăng nhập tại đây
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}