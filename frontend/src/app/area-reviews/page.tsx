'use client';

import React from 'react';
import Header from '@/components/Header';

export default function AreaReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">Đánh giá khu vực</h1>
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">Tính năng mới</span>
          </div>
          <p className="text-gray-500 text-sm mb-6">Khám phá và chia sẻ trải nghiệm thực tế về môi trường sống, tiện ích, an ninh tại các khu vực.</p>

          <div className="bg-blue-50/60 p-6 rounded-2xl border border-blue-100 mb-8">
            <h3 className="font-bold text-[#1877F2] text-base mb-1">💡 Chia sẻ góc nhìn của bạn</h3>
            <p className="text-sm text-gray-600">Giúp cộng đồng tìm kiếm nhà ở có thêm thông tin khách quan về ngõ phố, giao thông hay tiện ích xung quanh.</p>
          </div>

          <div className="text-center py-12 text-gray-400">
            <span className="text-5xl mb-3 block">🌳</span>
            <p className="text-sm">Chưa có đánh giá khu vực nào được ghi nhận.</p>
            <button onClick={() => alert('Tính năng thêm đánh giá khu vực đang được cập nhật!')} className="mt-4 bg-[#1877F2] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all text-sm">
              Viết đánh giá đầu tiên
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}