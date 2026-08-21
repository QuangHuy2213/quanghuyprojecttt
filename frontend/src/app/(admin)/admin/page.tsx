'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, pendingPosts: 0, activePosts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl('admin/stats'))
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => console.error("Lỗi tải thống kê:", err));
  }, []);

  if (loading) return <div className="p-8 text-gray-500 font-bold">Đang tải dữ liệu thật...</div>;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl">👥</div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tổng người dùng</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{stats.totalUsers}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-2xl">⏳</div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Bài viết chờ duyệt</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{stats.pendingPosts}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center text-2xl">🏠</div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Tổng bài viết (Active)</div>
            <div className="text-2xl font-black text-green-600 mt-1">{stats.activePosts}</div>
          </div>
        </div>
      </div>
    </div>
  );
}