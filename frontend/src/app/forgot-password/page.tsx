'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(apiUrl('auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Không tìm thấy email này trong hệ thống!');
      } else {
        setMessage('Đã gửi đường dẫn khôi phục mật khẩu! Vui lòng kiểm tra hộp thư của bạn.');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-12 px-8 shadow-2xl rounded-3xl border border-gray-100 sm:px-12">
          
          <div className="text-center mb-8">
            <Link href="/" className="inline-block bg-[#1877F2] text-white font-extrabold text-xl sm:text-2xl px-6 py-2.5 rounded-full shadow-md tracking-tight">
              NHÀ TỐT
            </Link>
            <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-gray-800">
              Quên mật khẩu?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Nhập email của bạn để nhận đường dẫn đặt lại mật khẩu
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm text-center p-3.5 rounded-xl font-medium">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm text-center p-3.5 rounded-xl font-medium">
                {message}
              </div>
            )}
            
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Email của bạn</label>
              <input 
                required 
                type="email" 
                placeholder="nhapemail@gmail.com"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full mt-3 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-[#1877F2] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Đang gửi...' : 'Gửi link khôi phục'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm sm:text-base border-t border-gray-100 pt-6">
            <Link href="/login" className="font-bold text-[#1877F2] hover:underline">
              ← Quay lại trang đăng nhập
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}