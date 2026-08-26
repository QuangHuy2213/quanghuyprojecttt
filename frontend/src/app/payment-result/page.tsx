'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header'; // Điều chỉnh đường dẫn Header của bạn nếu cần

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null); // 🌟 Thêm state lưu loại thanh toán

  useEffect(() => {
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type'); // UPGRADE hoặc INVOICE
    
    setStatus(statusParam);
    setPaymentType(typeParam);

    // 🌟 Chỉ cập nhật Role thành AGENT nếu giao dịch là UPGRADE
    if (statusParam === 'success' && typeParam === 'UPGRADE') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        userObj.role = 'AGENT';
        localStorage.setItem('user', JSON.stringify(userObj));
      }
    }
  }, [searchParams]);

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1877F2]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 mt-16">
        <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-lg w-full text-center animate-fadeInUp">
          
          {status === 'success' ? (
            <>
              <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">
                ✓
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 mb-4 tracking-tight">Thanh toán thành công!</h1>
              
              {/* 🌟 ĐIỀU KIỆN HIỂN THỊ DỰA TRÊN LOẠI THANH TOÁN */}
              {paymentType === 'UPGRADE' ? (
                <>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Chúc mừng bạn đã nâng cấp thành công lên tài khoản <strong className="text-amber-600">Môi Giới (Agent)</strong>. Gói dịch vụ của bạn có hiệu lực trong 3 tháng. Giờ đây bạn có thể bắt đầu đăng tin không giới hạn.
                  </p>
                  <Link 
                    href="/create-post" 
                    className="block w-full bg-gradient-to-r from-[#1877F2] to-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:-translate-y-1"
                  >
                    🚀 Đăng tin ngay
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                    Cảm ơn bạn đã thanh toán <strong className="text-blue-600">Phí giao dịch nền tảng</strong>. Hóa đơn của bạn đã được gạch nợ. Chúc bạn có thêm nhiều giao dịch thành công cùng Nhà Tốt!
                  </p>
                  <Link 
                    href="/my-transactions" 
                    className="block w-full bg-gradient-to-r from-[#1877F2] to-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:from-blue-600 hover:to-blue-700 transition-all transform hover:-translate-y-1"
                  >
                    📄 Xem lịch sử giao dịch
                  </Link>
                </>
              )}
            </>
          ) : (
            <>
              <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">
                ✕
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 mb-4 tracking-tight">Thanh toán thất bại</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Giao dịch của bạn đã bị hủy hoặc xảy ra lỗi trong quá trình xử lý. Tài khoản của bạn chưa bị trừ tiền. Vui lòng thử lại sau.
              </p>
              <Link 
                href="/" 
                className="block w-full bg-gray-100 text-gray-700 px-6 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Quay lại Trang chủ
              </Link>
            </>
          )}

        </div>
      </main>
    </div>
  );
}

// Bọc Suspense để Next.js không báo lỗi khi dùng useSearchParams trong Client Component
export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu...</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}