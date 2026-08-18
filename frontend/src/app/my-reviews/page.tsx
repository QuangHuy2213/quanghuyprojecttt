'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

export default function MyReviewsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">Đánh giá từ tôi</h1>
          <p className="text-gray-500 text-sm mb-6">Quản lý các nhận xét và đánh giá bạn đã viết cho các tin đăng hoặc người bán.</p>

          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl mb-3 block">⭐</span>
            <p className="text-sm">Bạn chưa gửi đánh giá nào.</p>
            <Link href="/" className="inline-block mt-4 bg-[#1877F2] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all text-sm">
              Khám phá ngay
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}