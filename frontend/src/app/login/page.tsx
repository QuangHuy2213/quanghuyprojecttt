'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // GỌI POPUP LỖI
        showToast(data.message || 'Tài khoản không đúng hoặc không tồn tại!', 'error');
      } else {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // GỌI POPUP THÀNH CÔNG
        showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        
        // Delay 1.5s để người dùng kịp đọc thông báo rồi mới chuyển trang
        setTimeout(() => {
          router.push('/'); 
        }, 1500);
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng!', 'error');
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

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-12 px-8 shadow-2xl rounded-3xl border border-gray-100 sm:px-12">
          
          {/* LOGO & TIÊU ĐỀ */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block bg-[#1877F2] text-white font-extrabold text-xl sm:text-2xl px-6 py-2.5 rounded-full shadow-md tracking-tight hover:opacity-95 transition-opacity">
              NHÀ TỐT
            </Link>
            <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-800">
              Chào mừng trở lại!
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Đăng nhập để quản lý tin đăng và khám phá ngôi nhà mơ ước
            </p>
          </div>

          {/* FORM ĐĂNG NHẬP */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Ô NHẬP EMAIL */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input 
                  required 
                  type="email" 
                  placeholder="nhapemail@gmail.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Ô NHẬP MẬT KHẨU */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              {/* ĐƯỜNG DẪN QUÊN MẬT KHẨU NẰM BÊN DƯỚI Ô NHẬP */}
              <div className="flex justify-end mt-2">
                <Link href="/forgot-password" className="text-xs sm:text-sm font-semibold text-[#1877F2] hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            {/* NÚT SUBMIT */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full mt-3 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-[#1877F2] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </button>
          </form>

          {/* CHUYỂN SANG TRANG ĐĂNG KÝ */}
          <div className="mt-8 text-center text-sm sm:text-base border-t border-gray-100 pt-6">
            <span className="text-gray-500">Chưa có tài khoản trên Nhà Tốt? </span>
            <Link href="/register" className="font-bold text-[#1877F2] hover:underline">
              Đăng ký ngay
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}