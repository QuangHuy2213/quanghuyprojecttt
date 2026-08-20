'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. TÁCH LOGIC XỬ LÝ RA MỘT COMPONENT CON
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Lấy token và thông tin user từ thanh địa chỉ (URL)
    const token = searchParams.get('token');
    const userData = searchParams.get('user');

    if (token && userData) {
      // Lưu vào localStorage
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', userData);
      
      // Chuyển hướng về trang chủ
      router.push('/');
    } else {
      // Nếu có lỗi, đẩy về trang đăng nhập
      router.push('/login');
    }
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg className="animate-spin h-10 w-10 text-[#1877F2]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-[#1877F2] font-bold animate-pulse text-lg tracking-wide">Đang xác thực tài khoản Google...</span>
    </div>
  );
}

// 2. COMPONENT CHÍNH BỌC SUSPENSE BÊN NGOÀI
export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      {/* Suspense giúp Next.js bỏ qua việc prerender component con lúc build */}
      <Suspense fallback={
        <div className="text-[#1877F2] font-bold animate-pulse">Đang tải cấu hình...</div>
      }>
        <CallbackContent />
      </Suspense>
    </div>
  );
}