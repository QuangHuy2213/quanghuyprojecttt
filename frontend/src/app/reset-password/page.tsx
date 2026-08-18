'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiUrl } from '../../services/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // Tự động lấy token từ URL trong email

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(apiUrl('auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Đường dẫn không hợp lệ hoặc đã hết hạn!');
      } else {
        setMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
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
              Đặt lại mật khẩu
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Nhập mật khẩu mới cho tài khoản của bạn
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
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mật khẩu mới</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Xác nhận mật khẩu mới</label>
              <input 
                required 
                type="password" 
                placeholder="••••••••"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !token} 
              className="w-full mt-3 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-[#1877F2] hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877F2] disabled:opacity-50 transition-all"
            >
              {isLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
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