'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = useState<any[]>([]);

  useEffect(() => {
    const searches = JSON.parse(localStorage.getItem('saved_searches') || '[]');
    setSavedSearches(searches);
  }, []);

  const handleRemove = (index: number) => {
    const updated = savedSearches.filter((_, i) => i !== index);
    setSavedSearches(updated);
    localStorage.setItem('saved_searches', JSON.stringify(updated));
  };

  return (
    <div className="user-page-shell min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-2">Tìm kiếm đã lưu</h1>
          <p className="text-gray-500 text-sm mb-6">Quản lý các bộ lọc và từ khóa tìm kiếm bất động sản yêu thích của bạn.</p>

          {savedSearches.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="text-5xl mb-3 block">🔖</span>
              <p className="text-sm">Bạn chưa lưu tìm kiếm nào.</p>
              <Link href="/" className="inline-block mt-4 bg-[#1877F2] text-white font-bold px-6 py-3 rounded-xl shadow-md hover:bg-blue-600 transition-all text-sm">
                Khám phá nhà đất ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {savedSearches.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-blue-50/30 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">Từ khóa: "{item.keyword || 'Tất cả'}"</h3>
                    <p className="text-xs text-gray-500 mt-1">Khu vực: {item.city || 'Toàn quốc'} {item.district ? `- ${item.district}` : ''}</p>
                  </div>
                  <button onClick={() => handleRemove(idx)} className="text-red-500 hover:bg-red-50 p-2.5 rounded-xl text-xs font-semibold transition-all">
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
