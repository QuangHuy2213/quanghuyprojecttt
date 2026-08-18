'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import PostList from '../components/PostList';
import Footer from '../components/Footer';
import { apiUrl } from '../services/api';

export default function HomePage() {
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filters, setFilters] = useState({ keyword: '', city: '', district: '', price: '', area: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  useEffect(() => {
    fetch(apiUrl('cities'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch((err) => console.error('Lỗi tải tỉnh thành:', err));
  }, []);

  useEffect(() => {
    if (filters.city) {
      fetch(apiUrl(`districts/${filters.city}`))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDistricts(data);
        })
        .catch((err) => console.error('Lỗi tải quận huyện:', err));
    } else {
      setDistricts([]);
      setFilters((prev) => ({ ...prev, district: '' }));
    }
  }, [filters.city]);

  const handleReset = () => {
    const empty = { keyword: '', city: '', district: '', price: '', area: '' };
    setFilters(empty);
    setAppliedFilters(empty);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(filters);
  };

  // HÀM LƯU TÌM KIẾM
  const handleSaveSearch = () => {
    if (!filters.keyword && !filters.city) {
      alert('Vui lòng nhập từ khóa hoặc chọn khu vực cần tìm kiếm trước khi lưu!');
      return;
    }
    
    const saved = JSON.parse(localStorage.getItem('saved_searches') || '[]');
    
    // Kiểm tra xem tìm kiếm này đã tồn tại chưa
    const exists = saved.some((s: any) => s.keyword === filters.keyword && s.city === filters.city && s.district === filters.district);
    if (exists) {
      alert('Tìm kiếm này đã có trong danh sách đã lưu của bạn!');
      return;
    }

    const updated = [filters, ...saved];
    localStorage.setItem('saved_searches', JSON.stringify(updated));
    alert('Đã lưu tìm kiếm thành công! Bạn có thể xem lại tại mục Tiện ích.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      {/* BANNER GRADIENT XANH DỊU MẮT, MƯỢT MÀ */}
      <section className="relative bg-gradient-to-r from-blue-500 via-[#1877F2] to-blue-600 pt-16 pb-32 text-center text-white overflow-hidden shadow-md">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-blue-50 text-xs font-semibold mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
            Nền tảng Bất động sản & Môi giới hàng đầu
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 tracking-tight drop-shadow-sm">
            Tìm kiếm ngôi nhà mơ ước
          </h1>
          
          <p className="text-blue-100 text-sm md:text-base font-medium opacity-95 max-w-xl mx-auto">
            Hàng ngàn tin đăng bất động sản chính chủ, uy tín và cập nhật mới mỗi ngày dành cho bạn.
          </p>
        </div>
      </section>

      {/* KHUNG TÌM KIẾM NỔI LÊN (FLOATING CARD) VỚI ĐỔ BÓNG ĐẬM & HỖ TRỢ ENTER */}
      <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-30 mb-6 w-full">
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-gray-100">
          
          {/* Ô TỪ KHÓA */}
          <div className="relative mb-5">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              value={filters.keyword} 
              onChange={(e) => setFilters({...filters, keyword: e.target.value})}
              placeholder="Nhập tên dự án, đường, khu vực cần tìm (Nhấn Enter để tìm)..." 
              className="w-full bg-gray-50/80 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all text-sm md:text-base"
            />
          </div>
          
          {/* CÁC DROPDOWN BỘ LỌC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
            
            <div>
              <select 
                value={filters.city} 
                onChange={(e) => setFilters({...filters, city: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all cursor-pointer"
              >
                <option value="">Tỉnh/Thành</option>
                {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <select 
                value={filters.district} 
                onChange={(e) => setFilters({...filters, district: e.target.value})} 
                disabled={!filters.city}
                className={`w-full border border-gray-200 rounded-xl p-3 text-sm transition-all ${!filters.city ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-50 text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1877F2]'}`}
              >
                <option value="">Quận/Huyện</option>
                {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>
            </div>

            <div>
              <select 
                value={filters.price} 
                onChange={(e) => setFilters({...filters, price: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all cursor-pointer"
              >
                <option value="">Mức giá</option>
                <option value="under-1b">Dưới 1 tỷ</option>
                <option value="1b-3b">1 - 3 tỷ</option>
                <option value="3b-5b">3 - 5 tỷ</option>
                <option value="over-5b">Trên 5 tỷ</option>
              </select>
            </div>

            <div>
              <select 
                value={filters.area} 
                onChange={(e) => setFilters({...filters, area: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1877F2] transition-all cursor-pointer"
              >
                <option value="">Diện tích</option>
                <option value="under-30">Dưới 30 m²</option>
                <option value="30-50">30 - 50 m²</option>
                <option value="50-80">50 - 80 m²</option>
                <option value="over-80">Trên 80 m²</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button 
                type="submit" 
                className="flex-1 bg-[#1877F2] hover:bg-blue-600 text-white rounded-xl font-bold py-3 px-3 shadow-md transition-all active:scale-95 text-xs whitespace-nowrap"
              >
                Lọc tin
              </button>
              <button 
                type="button" 
                onClick={handleSaveSearch} 
                className="bg-blue-50 hover:bg-blue-100 text-[#1877F2] border border-blue-200 rounded-xl font-bold py-3 px-3 transition-all text-xs whitespace-nowrap"
                title="Lưu tìm kiếm này"
              >
                🔖 Lưu
              </button>
              <button 
                type="button" 
                onClick={handleReset} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold py-3 px-2.5 transition-all text-xs"
                title="Làm mới bộ lọc"
              >
                🔄
              </button>
            </div>

          </div>

        </form>
      </div>

      {/* DANH SÁCH BÀI VIẾT */}
      <main className="max-w-6xl mx-auto px-4 pt-10 pb-12 flex-grow w-full">
        <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-extrabold text-gray-800 uppercase tracking-tight relative">
            Tin bất động sản mới đăng
            <span className="absolute -bottom-[17px] left-0 w-20 h-1 bg-[#1877F2]"></span>
          </h2>
        </div>
        <PostList filters={appliedFilters} />
      </main>

      <Footer />
    </div>
  );
}