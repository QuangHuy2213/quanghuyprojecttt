'use client';

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/services/api';

// 1. TÁCH LOGIC XỬ LÝ RA MỘT COMPONENT CON
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Lấy token và thông tin user từ thanh địa chỉ (URL)
    const token = searchParams.get('token');
    const userData = searchParams.get('user');

    if (token && userData) {
      // Lưu vào localStorage
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', userData);
      
      const parsedUser = JSON.parse(userData);
      if (parsedUser.phoneNumber) router.replace('/');
      else setNeedsPhone(true);
    } else {
      // Nếu có lỗi, đẩy về trang đăng nhập
      router.push('/login');
    }
  }, [router, searchParams]);

  const completeGoogleProfile = async () => {
    if (!/^0\d{9}$/.test(phone)) return setError('Số điện thoại phải gồm 10 số và bắt đầu bằng 0.');
    const token = localStorage.getItem('access_token');
    const res = await apiFetch('auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ phoneNumber: phone }) });
    const data = await res.json();
    if (!res.ok) return setError(data.message || 'Không thể cập nhật số điện thoại.');
    localStorage.setItem('user', JSON.stringify(data));
    router.replace('/');
  };

  if (needsPhone) return <div className="w-[min(92vw,430px)] rounded-3xl bg-white p-8 shadow-2xl border"><div className="text-4xl">📱</div><h1 className="mt-4 text-2xl font-black text-slate-900">Bổ sung số điện thoại</h1><p className="mt-2 text-sm text-slate-500">Thông tin này là bắt buộc để xác nhận giao dịch và bảo vệ tài khoản đăng nhập bằng Google.</p><input autoFocus maxLength={10} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,''))} placeholder="0912345678" className="mt-5 w-full rounded-xl border px-4 py-3 text-slate-900"/>{error&&<p className="mt-2 text-sm font-bold text-rose-600">{error}</p>}<button onClick={completeGoogleProfile} className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-black text-white">Hoàn tất đăng nhập</button></div>;

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
