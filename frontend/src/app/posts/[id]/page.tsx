'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header'; 
import { apiUrl } from '../../../services/api';

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  
  const [post, setPost] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState('');

  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);

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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    if (id) {
      const viewedPosts = JSON.parse(localStorage.getItem('viewed_posts') || '[]');
      const updatedHistory = [Number(id), ...viewedPosts.filter((item: number) => item !== Number(id))].slice(0, 20);
      localStorage.setItem('viewed_posts', JSON.stringify(updatedHistory));

      fetch(apiUrl(`posts/${id}`))
        .then(res => res.json())
        .then(data => {
          setPost(data);
          setSelectedImage(data.images?.[0]?.url || data.thumbnail || '');
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Lỗi:", err);
          setIsLoading(false);
        });
    }
  }, [id]);

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Thoả thuận';
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toLocaleString('vi-VN')} tỷ`;
    return `${(price / 1_000_000).toLocaleString('vi-VN')} triệu`;
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để thực hiện báo cáo!', 'error');
      return router.push('/login');
    }

    if (!reportReason) {
      return showToast('Vui lòng chọn lý do báo cáo!', 'error');
    }

    setIsReporting(true);
    try {
      const res = await fetch(apiUrl('reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          postId: post.id,
          reason: reportReason
        })
      });

      if (res.ok) {
        showToast('Báo cáo thành công. Cảm ơn bạn!', 'success');
        setReportModal(false);
        setReportReason('');
      } else {
        showToast('Có lỗi xảy ra, không thể gửi báo cáo.', 'error');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-[#1877F2] rounded-full animate-spin"></div>
          <span className="text-[#1877F2] font-semibold animate-pulse text-sm">Đang tải thông tin...</span>
        </div>
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <Header />
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Không tìm thấy tin đăng!</h2>
          <p className="text-gray-500 mb-6 text-sm">Tin đăng này có thể đã được chủ nhà gỡ bỏ hoặc không còn tồn tại.</p>
          <button onClick={() => router.push('/')} className="w-full bg-[#1877F2] text-white font-bold py-2.5 px-6 rounded-xl hover:bg-blue-600 transition-all">
            Quay về trang chủ
          </button>
        </div>
      </div>
    </div>
  );

  const displaySellerName = post.sellerName || post.user?.fullName || 'Người bán';
  const isOwner = currentUser && String(currentUser.id) === String(post.user?.id || post.userId);

  const REPORT_REASONS = [
    "Tin giả mạo, lừa đảo",
    "Thông tin không chính xác (giá, diện tích...)",
    "Đã bán nhưng chưa gỡ bài",
    "Hình ảnh không đúng thực tế",
    "Nội dung phản cảm, sai quy định",
    "Lý do khác..."
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden pb-12">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
      `}} />

      <Header />
      
      {/* POPUP TOAST */}
      <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
        <div className={`flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg text-white font-medium text-sm ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#1877F2]'}`}>
          <span className="text-lg">{toast.type === 'error' ? '⚠️' : '✓'}</span>
          {toast.message}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* CỘT TRÁI: HÌNH ẢNH VÀ CHI TIẾT (Chiếm 8 cột) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Khung Hình Ảnh */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group p-3">
              <img 
                src={selectedImage || post.thumbnail || 'https://via.placeholder.com/1000x600?text=No+Image'} 
                alt={post.title} 
                className="w-full h-[420px] object-cover rounded-xl"
              />
              {(post.images?.length > 1) && <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 gap-2">{post.images.map((image:any)=><button key={image.id} onClick={()=>setSelectedImage(image.url)} className={`overflow-hidden rounded-lg border-2 ${selectedImage===image.url?'border-blue-600':'border-transparent'}`}><img src={image.url} alt="Ảnh bất động sản" className="h-20 w-full object-cover"/></button>)}</div>}
            </div>

            {/* Khung Thông Tin Chính */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-snug">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
                <span className="font-bold text-3xl text-red-500 tracking-tight">
                  {formatPrice(post.price)}
                </span>
                
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                  <span className="text-gray-400 text-sm">📐</span> 
                  <span className="text-gray-600 text-sm">Diện tích:</span>
                  <strong className="text-gray-900 text-sm">{post.area} m²</strong>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-red-500 text-lg mt-0.5">📍</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Địa chỉ</span>
                  <span className="text-gray-700 text-sm font-medium">
                    {post.addressDetail ? `${post.addressDetail}, ` : ''} 
                    {post.ward ? `${post.ward}, ` : ''} 
                    {post.districts?.name}, {post.cities?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Khung Đặc Điểm */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-[#1877F2]">📋</span> Tổng quan bất động sản
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Diện tích', value: `${post.area} m²`, icon: '📐' },
                  { label: 'Phòng ngủ', value: `${post.bedrooms || '--'} PN`, icon: '🛏️' },
                  { label: 'Phòng tắm', value: `${post.bathrooms || '--'} WC`, icon: '🛁' },
                  { label: 'Pháp lý', value: post.legalDocument || 'Đang cập nhật', icon: '📄', highlight: true }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-gray-400 mb-1.5 text-base">{item.icon}</div>
                    <span className="text-gray-500 text-[11px] uppercase tracking-wider mb-0.5">{item.label}</span>
                    <span className={`font-semibold text-sm ${item.highlight ? 'text-[#1877F2] truncate' : 'text-gray-900'}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Khung Mô Tả */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-[#1877F2]">📝</span> Thông tin chi tiết
              </h2>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: THÔNG TIN NGƯỜI BÁN (Chiếm 4 cột) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-24">
              
              {/* Thẻ Người Bán */}
              <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {displaySellerName.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden flex-1">
                  <h3 className="font-bold text-gray-900 text-base truncate mb-1">{displaySellerName}</h3>
                  <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                    {post.user?.role === 'AGENT' ? 'Chuyên viên môi giới' : 'Cá nhân bán'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {!isOwner ? (
                  <>
                    <a 
                      href={`tel:${post.phone || post.user?.phoneNumber || '0901234567'}`}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>📞</span>
                      <span>{post.phone || post.user?.phoneNumber || '0901234567'}</span>
                    </a>
                    
                    <button 
                      onClick={() => {
                        if (!currentUser) {
                          showToast('Vui lòng đăng nhập để chat!', 'error');
                          return router.push('/login');
                        }

                        const sellerId = post.user?.id || post.userId;

                        router.push(
                          `/chat/${post.id}?sellerId=${encodeURIComponent(
                            String(sellerId)
                          )}&sellerName=${encodeURIComponent(displaySellerName)}`
                        );
                      }} 
                      className="w-full bg-white border border-[#1877F2] text-[#1877F2] hover:bg-blue-50 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>💬</span>
                      <span>Chat với {displaySellerName}</span>
                    </button>
                    <button 
                      onClick={() => setReportModal(true)}
                      className="w-full mt-4 text-gray-400 hover:text-red-500 text-xs font-medium py-2 transition-colors flex justify-center items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      Báo cáo tin đăng
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-500 text-sm font-medium">Đây là tin đăng của bạn</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* MODAL BÁO CÁO VI PHẠM */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-fade-in-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span className="text-red-500">🚩</span> Báo cáo tin đăng
              </h3>
              <button 
                onClick={() => setReportModal(false)} 
                className="text-gray-400 hover:text-red-500 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={submitReport} className="p-5">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Vui lòng chọn lý do để hệ thống kiểm tra và xử lý. Thông tin của bạn sẽ được bảo mật.
              </p>
              
              <div className="space-y-2 mb-5">
                {REPORT_REASONS.map((reason, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      reportReason === reason ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${reportReason === reason ? 'border-red-500' : 'border-gray-300'}`}>
                      {reportReason === reason && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                    </div>
                    <span className={`text-sm ${reportReason === reason ? 'font-semibold text-red-600' : 'text-gray-600'}`}>
                      {reason}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setReportModal(false)} 
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isReporting || !reportReason} 
                  className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {isReporting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
