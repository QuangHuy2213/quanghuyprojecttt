'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id;

  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 1. STATE QUẢN LÝ POPUP (TOAST NOTIFICATION)
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Form Data tương ứng với trang Đăng tin
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    area: '',
    city: '',
    district: '',
    addressDetail: '',
    bedrooms: '',
    bathrooms: '',
    thumbnail: '',
    content: '',
  });

  // Kiểm tra đăng nhập và lấy thông tin bài viết cũ
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      showToast('Bạn cần đăng nhập để chỉnh sửa tin!', 'error');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
      return;
    } else {
      setUser(JSON.parse(storedUser));
    }

    // Lấy danh sách Tỉnh/Thành
    fetch(apiUrl('/cities'))
      .then(res => res.json())
      .then(data => setCities(Array.isArray(data) ? data : (data?.data || [])));

    // Lấy chi tiết bài viết cần sửa
    if (postId) {
      fetch(apiUrl(`posts/${postId}`))
        .then(res => res.json())
        .then(data => {
          if (data) {
            setFormData({
              title: data.title || '',
              price: data.price || '',
              area: data.area || '',
              city: data.city || '',
              district: data.district || '',
              addressDetail: data.addressDetail || '',
              bedrooms: data.bedrooms !== null && data.bedrooms !== undefined ? data.bedrooms : '',
              bathrooms: data.bathrooms !== null && data.bathrooms !== undefined ? data.bathrooms : '',
              thumbnail: data.thumbnail || '',
              content: data.content || '',
            });
          }
          setIsFetching(false);
        })
        .catch(err => {
          console.error('Lỗi tải bài viết:', err);
          showToast('Không thể tải thông tin bài viết.', 'error');
          setIsFetching(false);
        });
    }
  }, [postId, router]);

  // Lấy Quận/Huyện khi Tỉnh/Thành thay đổi
  useEffect(() => {
    if (formData.city) {
      fetch(apiUrl(`/districts/${formData.city}`))
        .then(res => res.json())
        .then(data => setDistricts(Array.isArray(data) ? data : (data?.data || [])));
    } else {
      setDistricts([]);
    }
  }, [formData.city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = { 
        ...formData, 
        userId: user.id 
      };
      
      // Gọi API cập nhật (PATCH)
      const res = await fetch(apiUrl(`posts/${postId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Cập nhật tin thành công!', 'success');
        setTimeout(() => {
          router.push('/dashboard'); // Quay lại trang quản lý tin
        }, 1500);
      } else {
        showToast('Có lỗi xảy ra, vui lòng kiểm tra lại thông tin!', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center text-gray-500 font-medium">
          Đang tải dữ liệu bài viết...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col relative overflow-hidden">
      
      {/* 🌟 CSS ANIMATIONS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
      `}} />

      <Header />

      {/* 🌟 ANIMATED BACKGROUND BLOBS */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none mt-16">
        <div className="absolute top-[5%] left-[10%] w-96 h-96 bg-[#1877F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-[25%] right-[10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[10%] left-[30%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* 🌟 POPUP TOAST HIỆN ĐẠI */}
      <div 
        className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${
          toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'
        }`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full relative z-10 animate-fade-in-up">
        <div className="bg-white/80 backdrop-blur-2xl py-12 px-8 sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] border border-white transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)]">
          
          <div className="text-center mb-10">
            <span className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm px-6 py-2 rounded-2xl shadow-lg shadow-orange-500/30 tracking-tight mb-4">
              CHỈNH SỬA THÔNG TIN
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
              Cập nhật bài đăng #{postId}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-500 font-medium">
              Thay đổi thông tin bất động sản của bạn để thu hút nhiều người xem hơn
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Tiêu đề */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tiêu đề tin đăng *</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </span>
                <input 
                  required 
                  type="text" 
                  placeholder="VD: Bán nhà mặt phố Quận 1, giá rẻ..." 
                  className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                />
              </div>
            </div>

            {/* Giá & Diện tích */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mức giá (VNĐ) *</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <span className="font-bold text-lg">₫</span>
                  </span>
                  <input 
                    required 
                    type="number" 
                    placeholder="VD: 2500000000" 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Diện tích (m²) *</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  </span>
                  <input 
                    required 
                    type="number" 
                    placeholder="VD: 50" 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                    value={formData.area} 
                    onChange={(e) => setFormData({...formData, area: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Tỉnh/Thành & Quận/Huyện */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tỉnh / Thành phố *</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </span>
                  <select 
                    required 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium cursor-pointer appearance-none"
                    value={formData.city} 
                    onChange={(e) => setFormData({...formData, city: e.target.value, district: ''})}
                  >
                    <option value="" disabled>-- Chọn Tỉnh / Thành phố --</option>
                    {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Quận / Huyện *</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                  </span>
                  <select 
                    required 
                    disabled={!formData.city} 
                    className={`w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium transition-all duration-300 appearance-none ${!formData.city ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white/60 text-gray-700 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white'}`}
                    value={formData.district} 
                    onChange={(e) => setFormData({...formData, district: e.target.value})}
                  >
                    <option value="" disabled>-- Chọn Quận / Huyện --</option>
                    {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Số nhà / Tên đường */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số nhà, Tên đường</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="VD: 123 Đường Nguyễn Huệ..." 
                  className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                  value={formData.addressDetail} 
                  onChange={(e) => setFormData({...formData, addressDetail: e.target.value})} 
                />
              </div>
            </div>

            {/* Số phòng ngủ & Số phòng tắm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số phòng ngủ</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <span className="text-lg">🛏️</span>
                  </span>
                  <input 
                    type="number" min="0" 
                    placeholder="VD: 2" 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                    value={formData.bedrooms} 
                    onChange={(e) => setFormData({...formData, bedrooms: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số phòng tắm</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                    <span className="text-lg">🛁</span>
                  </span>
                  <input 
                    type="number" min="0" 
                    placeholder="VD: 2" 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                    value={formData.bathrooms} 
                    onChange={(e) => setFormData({...formData, bathrooms: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Hình ảnh */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Link hình ảnh (URL)</label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="Dán link ảnh ngôi nhà vào đây..." 
                  className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium"
                  value={formData.thumbnail} 
                  onChange={(e) => setFormData({...formData, thumbnail: e.target.value})} 
                />
              </div>
              <span className="text-xs text-gray-400 mt-2 block font-medium">Mẹo: Bạn có thể copy URL ảnh từ Google dán vào đây.</span>
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mô tả chi tiết *</label>
              <div className="relative group">
                <span className="absolute top-4 left-4 pointer-events-none text-gray-400 group-focus-within:text-[#1877F2] transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                </span>
                <textarea 
                  required 
                  rows={5} 
                  placeholder="Mô tả các đặc điểm nổi bật của ngôi nhà..." 
                  className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] focus:bg-white transition-all duration-300 font-medium resize-none"
                  value={formData.content} 
                  onChange={(e) => setFormData({...formData, content: e.target.value})} 
                />
              </div>
            </div>

            {/* Nút Submit & Hủy */}
            <div className="flex items-center gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => router.push('/dashboard')}
                className="w-1/3 py-4 px-4 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 transition-all active:scale-[0.98]"
              >
                Hủy bỏ
              </button>
              
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-2/3 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-lg shadow-orange-500/30 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:opacity-70 transition-all active:scale-[0.98]"
              >
                {isLoading ? 'ĐANG CẬP NHẬT...' : '💾 LƯU THAY ĐỔI'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}