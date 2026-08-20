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
        showToast(data.message || 'Tài khoản không đúng hoặc không tồn tại!', 'error');
      } else {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        
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
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* 🌟 CSS ANIMATIONS TÍCH HỢP SẴN */}
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

      {/* 🌟 ANIMATED BACKGROUND BLOBS (Khối màu nền chuyển động) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[10%] w-96 h-96 bg-[#1877F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob"></div>
        <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[30%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob animation-delay-4000"></div>
      </div>

      {/* 🌟 POPUP TOAST HIỆN ĐẠI (Glassmorphism) */}
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

      {/* 🌟 MAIN CARD (Giao diện Kính Mờ - Glassmorphism) */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-lg px-4 animate-fade-in-up">
        <div className="bg-white/70 backdrop-blur-2xl py-12 px-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] border border-white sm:px-12 transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)]">
          
          {/* LOGO & TIÊU ĐỀ */}
          <div className="text-center mb-10">
            <Link href="/" className="inline-block bg-gradient-to-r from-[#1877F2] to-blue-500 text-white font-extrabold text-xl px-6 py-2.5 rounded-2xl shadow-lg shadow-blue-500/30 tracking-tight transform hover:scale-105 transition-all">
              NHÀ TỐT
            </Link>
            <h2 className="mt-8 text-3xl font-extrabold text-gray-800 tracking-tight">
              Chào mừng trở lại!
            </h2>
            <p className="mt-3 text-sm text-gray-500 font-medium">
              Đăng nhập để tiếp tục hành trình tìm kiếm ngôi nhà mơ ước
            </p>
          </div>

          {/* FORM ĐĂNG NHẬP */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Ô NHẬP EMAIL */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Email của bạn</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input 
                  required 
                  type="email" 
                  placeholder="hello@nhatot.com"
                  className="w-full bg-white/50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 placeholder-gray-400 font-medium"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Ô NHẬP MẬT KHẨU */}
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
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end mt-3">
                <Link href="/forgot-password" className="text-xs font-bold text-[#1877F2] hover:text-blue-700 transition-colors">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            {/* NÚT SUBMIT */}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full mt-2 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-[#1877F2] to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-70 transform hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
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
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* ĐĂNG NHẬP BẰNG GOOGLE (MỚI THÊM) */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-[#fdfdfd] text-gray-400 font-semibold rounded-full">Hoặc đăng nhập bằng</span>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="http://localhost:3001/auth/google"
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl shadow-sm border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-sm font-bold text-gray-700 transition-all duration-300 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Đăng nhập với Google
              </a>
            </div>
          </div>

          {/* CHUYỂN SANG TRANG ĐĂNG KÝ */}
          <div className="mt-10 text-center text-sm border-t border-gray-100/60 pt-6">
            <span className="text-gray-500 font-medium">Chưa có tài khoản trên Nhà Tốt? </span>
            <Link href="/register" className="font-bold text-[#1877F2] hover:text-blue-700 transition-colors">
              Đăng ký ngay
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}