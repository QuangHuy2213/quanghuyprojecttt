'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function EditPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id;
  const [formData, setFormData] = useState<any>({ title: '', price: '', area: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Lấy dữ liệu cũ để điền vào form
    fetch(apiUrl(`posts/${postId}`))
      .then(res => res.json())
      .then(data => setFormData(data))
      .catch(err => console.error(err));
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const res = await fetch(apiUrl(`posts/${postId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id })
      });
      
      if (res.ok) {
        alert('Cập nhật thành công!');
        router.push('/dashboard');
      } else {
        alert('Lỗi cập nhật!');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <main className="max-w-3xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          
          <div className="text-center mb-8">
            <span className="inline-block bg-[#1877F2] text-white font-extrabold text-xl px-6 py-2.5 rounded-full shadow-md tracking-tight mb-3">
              NHÀ TỐT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
              Chỉnh sửa tin đăng
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Cập nhật lại thông tin chi tiết cho bài đăng bất động sản của bạn
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Tiêu đề tin đăng *</label>
              <input 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mức giá (VNĐ) *</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Diện tích (m²) *</label>
                <input 
                  required
                  type="number" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all" 
                  value={formData.area} 
                  onChange={e => setFormData({...formData, area: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Nội dung mô tả *</label>
              <textarea 
                required
                rows={5}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all" 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 mt-3 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-base rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? 'ĐANG CẬP NHẬT...' : '💾 LƯU THAY ĐỔI'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}