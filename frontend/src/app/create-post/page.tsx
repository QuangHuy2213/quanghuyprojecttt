'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { apiUrl } from '../../services/api';

export default function CreatePostPage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    area: '',
    city: '',
    district: '',
    thumbnail: '',
    content: '',
  });

  // Kiểm tra đăng nhập khi vừa vào trang
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('Bạn cần đăng nhập để đăng tin!');
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }

    // Lấy danh sách Tỉnh/Thành
    fetch(apiUrl('/cities'))
      .then(res => res.json())
      .then(data => setCities(Array.isArray(data) ? data : (data?.data || [])));
  }, []);

  // Lấy Quận/Huyện khi chọn Tỉnh/Thành
  useEffect(() => {
    if (formData.city) {
      fetch(apiUrl(`/districts/${formData.city}`))
        .then(res => res.json())
        .then(data => setDistricts(Array.isArray(data) ? data : (data?.data || [])));
    } else {
      setDistricts([]);
      setFormData(prev => ({ ...prev, district: '' }));
    }
  }, [formData.city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = { ...formData, userId: user.id };
      
      const res = await fetch(apiUrl('/posts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert('Đăng tin thành công rực rỡ!');
        router.push('/'); 
      } else {
        alert('Có lỗi xảy ra, vui lòng thử lại!');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-blue-100 flex flex-col">
      <Header />
      <div className="max-w-3xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white py-12 px-8 sm:px-12 shadow-2xl rounded-3xl border border-gray-100">
          
          <div className="text-center mb-8">
            <span className="inline-block bg-[#1877F2] text-white font-extrabold text-xl px-6 py-2.5 rounded-full shadow-md tracking-tight mb-3">
              NHÀ TỐT
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800">
              Đăng tin bất động sản
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-500">
              Chia sẻ thông tin nhà đất nhanh chóng đến hàng ngàn người có nhu cầu
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tiêu đề */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Tiêu đề tin đăng *</label>
              <input 
                required 
                type="text" 
                placeholder="VD: Bán nhà mặt phố Quận 1, giá rẻ..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
              />
            </div>

            {/* Giá & Diện tích */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mức giá (VNĐ) *</label>
                <input 
                  required 
                  type="number" 
                  placeholder="VD: 2500000000" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Diện tích (m²) *</label>
                <input 
                  required 
                  type="number" 
                  placeholder="VD: 50" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                  value={formData.area} 
                  onChange={(e) => setFormData({...formData, area: e.target.value})} 
                />
              </div>
            </div>

            {/* Khu vực */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Tỉnh / Thành phố *</label>
                <select 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all cursor-pointer"
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value, district: ''})}
                >
                  <option value="">-- Chọn Tỉnh / Thành --</option>
                  {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Quận / Huyện *</label>
                <select 
                  required 
                  disabled={!formData.city} 
                  className={`w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base transition-all ${!formData.city ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1877F2]'}`}
                  value={formData.district} 
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                >
                  <option value="">-- Chọn Quận / Huyện --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Hình ảnh */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Link hình ảnh (URL)</label>
              <input 
                type="text" 
                placeholder="Dán link ảnh ngôi nhà vào đây..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.thumbnail} 
                onChange={(e) => setFormData({...formData, thumbnail: e.target.value})} 
              />
              <span className="text-xs text-gray-400 mt-1.5 block">Mẹo: Bạn có thể copy URL ảnh từ Google dán vào đây.</span>
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-gray-600 uppercase mb-1.5">Mô tả chi tiết *</label>
              <textarea 
                required 
                rows={5} 
                placeholder="Mô tả các đặc điểm nổi bật của ngôi nhà..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm sm:text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all"
                value={formData.content} 
                onChange={(e) => setFormData({...formData, content: e.target.value})} 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 mt-3 bg-[#1877F2] hover:bg-blue-600 text-white font-bold text-base rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? 'ĐANG XỬ LÝ...' : '🚀 ĐĂNG TIN NGAY'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}