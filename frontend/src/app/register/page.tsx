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

  // STATE QUẢN LÝ POPUP (TOAST NOTIFICATION)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // HÀM CHẶN NHẬP KÝ TỰ LẠ VÀO SỐ ĐIỆN THOẠI
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const onlyNums = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, phoneNumber: onlyNums });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // KIỂM TRA BẢO MẬT SỐ ĐIỆN THOẠI
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
        if (data.message && data.message.toLowerCase().includes('email')) {
          showToast('Email này đã được đăng ký! Vui lòng sử dụng email khác.', 'error');
        } else {
          showToast(data.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại!', 'error');
        }
      } else {
        showToast('Đăng ký thành công! Đang chuyển hướng...', 'success');
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
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* 🌟 CSS ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
      `}} />

      {/* 🌟 ANIMATED BACKGROUND BLOBS */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[5%] w-96 h-96 bg-[#1877F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute top-[30%] right-[5%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[0%] left-[20%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* 🌟 POPUP TOAST HIỆN ĐẠI */}
      <div 
        className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${
          toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'
        }`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

      {/* 🌟 MAIN CARD (Giao diện Kính Mờ) */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg px-4 animate-fade-in-up">
        <div className="bg-white/70 backdrop-blur-2xl py-12 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] border border-white sm:px-12 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)]">
          
          {/* LOGO & TIÊU ĐỀ */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-block bg-gradient-to-r from-[#1877F2] to-blue-500 text-white font-extrabold text-xl px-6 py-2.5 rounded-2xl shadow-lg shadow-blue-500/30 tracking-tight transform hover:scale-105 transition-all">
              NHÀ TỐT
            </Link>
            <h2 className="mt-8 text-3xl font-extrabold text-gray-800 tracking-tight">
              Tạo tài khoản mới
            </h2>
            <p className="mt-3 text-sm text-gray-500 font-medium">
              Gia nhập cộng đồng bất động sản lớn nhất Việt Nam
            </p>
          </div>

          {/* FORM ĐĂNG KÝ */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* HỌ VÀ TÊN */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Họ và tên</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input 
                  required 
                  type="text" 
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 placeholder-gray-400 font-medium"
                  value={formData.fullName} 
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            </div>

            {/* SỐ ĐIỆN THOẠI */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số điện thoại</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input 
                  required 
                  type="tel" 
                  maxLength={10}
                  placeholder="0912345678"
                  className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 placeholder-gray-400 font-medium"
                  value={formData.phoneNumber} 
                  onChange={handlePhoneChange}
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Email</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input 
                  required 
                  type="email" 
                  placeholder="nhapemail@gmail.com"
                  className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 placeholder-gray-400 font-medium"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mật khẩu</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 placeholder-gray-400 font-medium"
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {/* NÚT SUBMIT */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full mt-4 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-[#1877F2] to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70 transform hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Đăng ký tài khoản'
              )}
            </button>
          </form>

          {/* CHUYỂN SANG ĐĂNG NHẬP */}
          <div className="mt-8 text-center text-sm border-t border-gray-100/60 pt-6">
            <span className="text-gray-500 font-medium">Đã có tài khoản trên Nhà Tốt? </span>
            <Link href="/login" className="font-bold text-[#1877F2] hover:text-blue-700 transition-colors">
              Đăng nhập ngay
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}