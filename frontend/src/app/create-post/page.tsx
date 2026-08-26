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
  
  // STATE QUẢN LÝ POPUP
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🌟 FORM DATA TÍCH HỢP NHIỀU ẢNH VÀ CHỌN VAI TRÒ
  const [formData, setFormData] = useState({
    title: '',
    transactionType: 'SALE', // 'SALE' hoặc 'RENT'
    posterType: 'OWNER',     // 'OWNER' (Chủ nhà) hoặc 'BROKER' (Môi giới)
    price: '',
    brokerCommission: '',    // Môi giới nhập % hoa hồng (chỉ dành cho BÁN)
    area: '',
    city: '',
    district: '',
    addressDetail: '',
    bedrooms: '',
    bathrooms: '',
    thumbnail: '',           // Ảnh đại diện chính (lấy từ ảnh đầu tiên hoặc link dán)
    images: [] as string[],  // Mảng chứa danh sách nhiều ảnh
    urlInput: '',            // Input tạm để dán link URL ảnh
    content: '',
  });

  // State hiển thị phí chiết khấu dự tính
  const [calculatedFeeInfo, setCalculatedFeeInfo] = useState<{ text: string, fee: number | null }>({ text: '', fee: null });

  // Kiểm tra đăng nhập
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      showToast('Bạn cần đăng nhập để đăng tin!', 'error');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    if (parsedUser.role === 'AGENT' || parsedUser.role === 'ADMIN') {
      setFormData(prev => ({ ...prev, posterType: 'BROKER' }));
    }

    fetch(apiUrl('cities')).then(res => res.json()).then(data => setCities(Array.isArray(data) ? data : (data?.data || [])));
  }, [router]);

  // Lấy Quận/Huyện
  useEffect(() => {
    if (formData.city) {
      fetch(apiUrl(`districts/${formData.city}`)).then(res => res.json()).then(data => setDistricts(Array.isArray(data) ? data : (data?.data || [])));
    } else {
      setDistricts([]);
      setFormData(prev => ({ ...prev, district: '' }));
    }
  }, [formData.city]);

  // 🌟 LOGIC TÍNH TOÁN CHIẾT KHẤU THỜI GIAN THỰC
  useEffect(() => {
    if (!formData.price) {
      setCalculatedFeeInfo({ text: '', fee: null });
      return;
    }

    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const isOwner = formData.posterType === 'OWNER'; 
    const isBroker = formData.posterType === 'BROKER';

    if (isOwner) {
      if (formData.transactionType === 'SALE') {
        const fee = priceNum * 0.015;
        setCalculatedFeeInfo({ text: 'Chủ nhà Bán: App thu 1.5% giá trị giao dịch', fee });
      } else {
        const feeMonth1 = priceNum * 0.10;
        setCalculatedFeeInfo({ text: 'Chủ nhà Cho thuê: App thu 10% tháng đầu (và 2% các tháng sau)', fee: feeMonth1 });
      }
    } else if (isBroker) {
      if (formData.transactionType === 'SALE') {
        const commPercent = parseFloat(formData.brokerCommission) || 0;
        const brokerMoney = priceNum * (commPercent / 100);
        const fee = brokerMoney * 0.20;
        setCalculatedFeeInfo({ 
          text: `Môi giới Bán (Hoa hồng ${commPercent}% = ${brokerMoney.toLocaleString()}đ): App thu 20% hoa hồng`, 
          fee 
        });
      } else {
        const fee = priceNum * 0.20;
        setCalculatedFeeInfo({ text: 'Môi giới Cho thuê (Hoa hồng = 1 tháng tiền thuê): App thu 20% hoa hồng', fee });
      }
    }
  }, [formData.price, formData.transactionType, formData.posterType, formData.brokerCommission]);

  // 🌟 XỬ LÝ CHỌN NHIỀU ẢNH TỪ MÁY TÍNH
  const handleMultipleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          const resultStr = reader.result as string;
          setFormData(prev => {
            const updatedImages = [...prev.images, resultStr];
            return {
              ...prev,
              images: updatedImages,
              thumbnail: prev.thumbnail || resultStr // Lấy ảnh đầu tiên làm ảnh bìa nếu chưa có
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
    showToast('Đã thêm ảnh thành công!', 'success');
  };

  // 🌟 XỬ LÝ DÁN LINK URL VÀO DANH SÁCH ẢNH (GIỮ NGUYÊN TÍNH NĂNG GỬI LINK)
  const handleAddUrlImage = () => {
    if (!formData.urlInput.trim()) return;
    const url = formData.urlInput.trim();
    setFormData(prev => {
      const updatedImages = [...prev.images, url];
      return {
        ...prev,
        images: updatedImages,
        thumbnail: prev.thumbnail || url,
        urlInput: '' // Reset ô input link
      };
    });
    showToast('Đã thêm link ảnh thành công!', 'success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);

    try {
      const { urlInput: _urlInput, ...postFormData } = formData;
      const payload = {
        ...postFormData,
        price: parseFloat(formData.price),
        area: parseFloat(formData.area),
        bedrooms: parseInt(formData.bedrooms) || 0,
        bathrooms: parseInt(formData.bathrooms) || 0,
        brokerCommission: parseFloat(formData.brokerCommission) || null,
        userId: user.id,
        sellerName: user.fullName || 'Người dùng' 
      };
      
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const res = await fetch(apiUrl('posts'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Đăng tin thành công rực rỡ!', 'success');
        setTimeout(() => router.push('/'), 1500);
      } else {
        showToast('Có lỗi xảy ra, vui lòng kiểm tra lại thông tin!', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null; 

  const isBroker = formData.posterType === 'BROKER';

  return (
    <div className="min-h-screen bg-[#f4f7f6] flex flex-col relative overflow-hidden">
      
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

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none mt-16">
        <div className="absolute top-[5%] left-[10%] w-96 h-96 bg-[#1877F2] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob"></div>
        <div className="absolute top-[25%] right-[10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[10%] left-[30%] w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] transition-all duration-500 ease-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <div className={`flex items-center gap-3 px-6 py-3.5 rounded-full shadow-lg backdrop-blur-md text-white font-semibold text-sm border border-white/20 ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-[#1877F2]/90'}`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✨'}</span>
          {toast.message}
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full relative z-10 animate-fade-in-up">
        <div className="bg-white/85 backdrop-blur-2xl py-12 px-8 sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[2.5rem] border border-white transition-all">
          
          <div className="text-center mb-10">
            <span className={`inline-block text-white font-extrabold text-sm px-6 py-2 rounded-2xl shadow-lg tracking-tight mb-4 ${isBroker ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-500/30' : 'bg-gradient-to-r from-[#1877F2] to-blue-500 shadow-blue-500/30'}`}>
              {isBroker ? 'ĐĂNG TIN VỚI TƯ CÁCH MÔI GIỚI' : 'ĐĂNG TIN VỚI TƯ CÁCH CHỦ NHÀ'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 tracking-tight">
              Đăng tin bất động sản
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-500 font-medium">
              Chia sẻ thông tin nhà đất, tiếp cận hàng ngàn khách hàng tiềm năng
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 🌟 NÚT CHỌN LỰA: CHỦ NHÀ HOẶC MÔI GIỚI */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Bạn đăng tin với tư cách là? *</label>
              <div className="bg-gray-50/50 p-2 rounded-3xl border border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, posterType: 'OWNER'})}
                  className={`flex-1 py-3.5 text-sm font-bold rounded-2xl transition-all ${
                    formData.posterType === 'OWNER' 
                      ? 'bg-white text-[#1877F2] shadow-md border border-gray-200' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  🏠 Chủ nhà (Chính chủ)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, posterType: 'BROKER'})}
                  className={`flex-1 py-3.5 text-sm font-bold rounded-2xl transition-all ${
                    formData.posterType === 'BROKER' 
                      ? 'bg-white text-orange-600 shadow-md border border-gray-200' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  🤝 Môi giới (Agent)
                </button>
              </div>
            </div>

            {/* NÚT CHỌN LOẠI HÌNH BÁN / CHO THUÊ */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Loại hình giao dịch *</label>
              <div className="bg-gray-50/50 p-2 rounded-3xl border border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, transactionType: 'SALE'})}
                  className={`flex-1 py-3.5 text-sm font-bold rounded-2xl transition-all ${
                    formData.transactionType === 'SALE' 
                      ? 'bg-white text-[#1877F2] shadow-md border border-gray-200' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  🤝 Cần Bán
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, transactionType: 'RENT'})}
                  className={`flex-1 py-3.5 text-sm font-bold rounded-2xl transition-all ${
                    formData.transactionType === 'RENT' 
                      ? 'bg-white text-emerald-600 shadow-md border border-gray-200' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  🏠 Cho Thuê
                </button>
              </div>
            </div>

            {/* Tiêu đề */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tiêu đề tin đăng *</label>
              <input required type="text" placeholder="VD: Bán nhà mặt phố Quận 1, giá rẻ..." 
                className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] transition-all font-medium"
                value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} 
              />
            </div>

            {/* Giá & Diện tích */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                  {formData.transactionType === 'SALE' ? 'Mức giá (VNĐ) *' : 'Giá thuê / tháng (VNĐ) *'}
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400 font-bold text-lg">₫</span>
                  <input required type="number" placeholder="VD: 2500000000" 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-sm text-gray-800 focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] transition-all font-medium font-mono"
                    value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Diện tích (m²) *</label>
                <input required type="number" placeholder="VD: 50" 
                  className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] transition-all font-medium"
                  value={formData.area} onChange={(e) => setFormData({...formData, area: e.target.value})} 
                />
              </div>
            </div>

            {/* NẾU LÀ MÔI GIỚI BÁN: Yêu cầu nhập % Hoa hồng */}
            {isBroker && formData.transactionType === 'SALE' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <label className="block text-xs font-bold text-amber-700 uppercase mb-2 tracking-wider">Hoa hồng môi giới bạn nhận được (%) *</label>
                <div className="relative group flex items-center">
                  <input required type="number" step="0.1" placeholder="VD: 2.0" 
                    className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-medium font-mono"
                    value={formData.brokerCommission} onChange={(e) => setFormData({...formData, brokerCommission: e.target.value})} 
                  />
                  <span className="absolute right-4 text-amber-500 font-bold">%</span>
                </div>
                <p className="text-[10px] text-amber-600 mt-2 italic">* Tỉ lệ này dùng để hệ thống đối soát và tính chiết khấu khi giao dịch thành công.</p>
              </div>
            )}

            {/* HIỂN THỊ CHIẾT KHẤU THỜI GIAN THỰC */}
            {calculatedFeeInfo.fee !== null && (
              <div className="bg-[#f0f9ff] border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg">💰</div>
                  <div>
                    <div className="text-xs text-blue-600 font-bold uppercase">Dự tính chiết khấu nền tảng</div>
                    <div className="text-xs text-gray-500 mt-0.5">{calculatedFeeInfo.text}</div>
                  </div>
                </div>
                <div className="text-xl font-black text-[#1877F2] font-mono whitespace-nowrap">
                  {calculatedFeeInfo.fee.toLocaleString()} VNĐ
                </div>
              </div>
            )}

            {/* 🌟 HÌNH ẢNH: HỖ TRỢ CHỌN NHIỀU ẢNH + DÁN LINK URL (GIỮ TRỌN VẸN CẢ HAI) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Hình ảnh bất động sản (Chọn nhiều ảnh hoặc dán link) *</label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Cách 1: Chọn nhiều file từ máy tính */}
                <div className="flex-1 relative">
                  <input type="file" multiple accept="image/*" onChange={handleMultipleImagesUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl px-4 py-4 text-sm text-gray-500 text-center flex items-center justify-center gap-2 hover:bg-gray-100 hover:border-[#1877F2] transition-all">
                    <span>🖼️</span> Bấm để chọn nhiều ảnh từ máy
                  </div>
                </div>

                {/* Cách 2: Dán Link URL ảnh */}
                <div className="flex-1 flex gap-2">
                  <input type="text" placeholder="Hoặc dán Link URL ảnh vào đây..." 
                    className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 focus:ring-4 focus:ring-[#1877F2]/10 focus:border-[#1877F2] transition-all font-medium"
                    value={formData.urlInput} onChange={(e) => setFormData({...formData, urlInput: e.target.value})} 
                  />
                  <button type="button" onClick={handleAddUrlImage} className="px-5 bg-gray-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all">
                    Thêm link
                  </button>
                </div>
              </div>

              {/* Lưới hiển thị danh sách ảnh đã chọn / thêm */}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative rounded-xl overflow-hidden border border-gray-200 h-28 bg-gray-100 group shadow-sm">
                      <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-[#1877F2] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow">
                          Ảnh bìa
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const updatedImages = formData.images.filter((_, i) => i !== index);
                          setFormData(prev => ({
                            ...prev,
                            images: updatedImages,
                            thumbnail: updatedImages[0] || '' // Cập nhật lại ảnh bìa chính
                          }));
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tỉnh/Thành & Quận/Huyện */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Tỉnh / Thành phố *</label>
                <select required className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-700 focus:ring-4 focus:ring-[#1877F2]/10 transition-all font-medium cursor-pointer"
                  value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value, district: ''})}
                >
                  <option value="" disabled>-- Chọn Tỉnh / Thành phố --</option>
                  {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Quận / Huyện *</label>
                <select required disabled={!formData.city} 
                  className={`w-full border border-gray-200 rounded-2xl px-4 py-4 text-sm font-medium transition-all ${!formData.city ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white/60 text-gray-700 cursor-pointer focus:ring-4 focus:ring-[#1877F2]/10'}`}
                  value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})}
                >
                  <option value="" disabled>-- Chọn Quận / Huyện --</option>
                  {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Số phòng ngủ, Phòng tắm, Số nhà */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số phòng ngủ</label>
                <input type="number" min="0" placeholder="VD: 2" className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 transition-all" value={formData.bedrooms} onChange={(e) => setFormData({...formData, bedrooms: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Số phòng tắm</label>
                <input type="number" min="0" placeholder="VD: 2" className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 transition-all" value={formData.bathrooms} onChange={(e) => setFormData({...formData, bathrooms: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Đường/Số nhà</label>
                <input type="text" placeholder="Đ.Nguyễn Huệ" className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 transition-all" value={formData.addressDetail} onChange={(e) => setFormData({...formData, addressDetail: e.target.value})} />
              </div>
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">Mô tả chi tiết *</label>
              <textarea required rows={5} placeholder="Mô tả các đặc điểm nổi bật của ngôi nhà..." 
                className="w-full bg-white/60 border border-gray-200 rounded-2xl px-4 py-4 text-sm text-gray-800 focus:ring-4 focus:ring-[#1877F2]/10 transition-all font-medium resize-none"
                value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} 
              />
            </div>

            {/* Nút Submit */}
            <button type="submit" disabled={isLoading} 
              className="w-full mt-6 flex items-center justify-center gap-2 py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-[#1877F2] to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-70 transform hover:-translate-y-0.5 transition-all"
            >
              {isLoading ? 'ĐANG XỬ LÝ...' : '🚀 ĐĂNG TIN NGAY'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}