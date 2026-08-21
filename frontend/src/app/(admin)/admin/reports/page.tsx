'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';
import Link from 'next/link';

// 🌟 BƯỚC 1: TẠO COMPONENT THÔNG MINH CHO TỪNG BÁO CÁO (HỖ TRỢ KÉO/VUỐT ĐỂ XÓA)
const SwipeableReportItem = ({ report, handleResolveAndRemovePost, handleIgnoreReport, setDeleteModal }: any) => {
  const [offsetX, setOffsetX] = useState(0);
  const [startX, setStartX] = useState(0);

  // Bắt đầu chạm
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  // Đang vuốt
  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // Chỉ cho phép vuốt sang trái (số âm)
    if (diff < 0) {
      setOffsetX(Math.max(diff, -120)); // Kéo tối đa 120px
    } else if (offsetX < 0) {
      setOffsetX(Math.min(offsetX + diff, 0)); // Vuốt ngược lại để đóng
    }
  };

  // Thả tay ra
  const handleTouchEnd = () => {
    if (offsetX < -60) {
      setOffsetX(-120); // Nếu kéo qua nửa đường -> Tự động mở hết cỡ
    } else {
      setOffsetX(0);    // Nếu kéo nhẹ -> Tự động đóng lại
    }
  };

  // Tự động đóng lại nếu dữ liệu thay đổi
  useEffect(() => { setOffsetX(0); }, [report]);

  return (
    <div className="relative overflow-hidden border-b border-gray-100 last:border-0 group bg-red-500">
      
      {/* 💥 LỚP ẨN BÊN DƯỚI: NÚT XÓA BÁO CÁO MÀU ĐỎ TƯƠI */}
      <div
        onClick={() => setDeleteModal({ isOpen: true, id: report.id })}
        className="absolute inset-y-0 right-0 w-[120px] bg-red-500 text-white flex flex-col justify-center items-center cursor-pointer hover:bg-red-600 transition-colors z-0"
      >
        <span className="text-3xl mb-1">🗑️</span>
        <span className="text-sm font-bold">Xóa báo cáo</span>
      </div>

      {/* 📄 LỚP TRÊN: NỘI DUNG BÁO CÁO (CÓ THỂ TRƯỢT QUA LẠI) */}
      <div
        className={`relative z-10 w-full flex flex-col md:flex-row gap-6 p-6 transition-transform duration-300 ease-out md:group-hover:-translate-x-[120px] ${
          report.status === 'PENDING' ? 'bg-white' : 'bg-gray-50 text-gray-500'
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* CỘT 1: THÔNG TIN NGƯỜI BÁO CÁO */}
        <div className="md:w-1/4 flex-shrink-0">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Người báo cáo</div>
          <div className="font-bold text-gray-800 text-lg">{report.user?.fullName || 'Ẩn danh'}</div>
          <div className="text-sm text-gray-500 mt-1 flex items-center gap-2"><span>📧</span> {report.user?.email || 'N/A'}</div>
          <div className="text-xs text-gray-400 mt-2 font-medium">{new Date(report.createdAt).toLocaleString('vi-VN')}</div>
        </div>

        {/* CỘT 2: NỘI DUNG BÁO CÁO */}
        <div className="md:w-2/4 flex-1">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mục tiêu bị báo cáo</div>
          {report.post ? (
            <Link href={`/posts/${report.post.id}`} target="_blank" className="text-[#1877F2] font-bold text-sm hover:underline mb-2 block">
              Bài đăng: {report.post.title} ↗
            </Link>
          ) : (
            <span className="text-gray-400 italic text-sm block mb-2">Bài đăng đã bị xóa hoặc không còn tồn tại</span>
          )}
          
          <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-sm leading-relaxed mt-2">
            <span className="font-bold block mb-1">Lý do vi phạm:</span>
            {report.reason}
          </div>
        </div>

        {/* CỘT 3: TRẠNG THÁI & HÀNH ĐỘNG */}
        <div className="md:w-1/4 flex flex-col justify-between items-end pl-6 md:border-l border-gray-200 flex-shrink-0 pr-4">
          <div className="mb-4">
            {report.status === 'PENDING' ? (
              <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Chờ xử lý
              </span>
            ) : report.status === 'RESOLVED' ? (
              <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                <span className="text-green-600 text-sm">✓</span> Đã giải quyết
              </span>
            ) : (
              <span className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                Đã bỏ qua
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full mt-auto">
            {report.status === 'PENDING' && (
              <>
                {report.post && (
                  <button 
                    onClick={() => handleResolveAndRemovePost(report.id, report.post.id)} 
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-red-500/20 flex items-center justify-center gap-2"
                  >
                    🗑️ Xóa bài & Giải quyết
                  </button>
                )}
                <button 
                  onClick={() => handleIgnoreReport(report.id)} 
                  className="w-full bg-gray-100 text-gray-600 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  ✗ Bỏ qua báo cáo
                </button>
              </>
            )}
          </div>
        </div>

        {/* MŨI TÊN GỢI Ý VUỐT */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 md:hidden animate-pulse flex flex-col">
          <span className="text-lg">❮</span>
        </div>
      </div>
    </div>
  );
};

// 🌟 BƯỚC 2: TRANG QUẢN LÝ BÁO CÁO CHÍNH
export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: 0 }); 

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
  };

  const fetchReports = () => {
    setLoading(true);
    fetch(apiUrl('admin/reports'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReports(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải báo cáo:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchReports(); }, []);

  // Xóa bài viết và đánh dấu đã giải quyết
  const handleResolveAndRemovePost = async (reportId: number, postId: number) => {
    if (!confirm('Xác nhận xóa bài viết vi phạm này và đánh dấu đã xử lý báo cáo?')) return;

    try {
      const res = await fetch(apiUrl(`admin/reports/${reportId}/post/${postId}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        setReports(reports.map(r => r.id === reportId ? { ...r, status: 'RESOLVED', post: null } : r));
        showToast('Đã xóa bài viết và giải quyết báo cáo thành công!');
      } else {
        showToast('Có lỗi xảy ra khi xóa!', 'error');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  // Bỏ qua báo cáo
  const handleIgnoreReport = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn bỏ qua báo cáo này?')) return;

    try {
      const res = await fetch(apiUrl(`admin/reports/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IGNORED' }),
      });

      if (res.ok) {
        setReports(reports.map(r => r.id === id ? { ...r, status: 'IGNORED' } : r));
        showToast('Đã bỏ qua báo cáo.');
      } else {
        showToast('Có lỗi xảy ra!', 'error');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  // Xóa hẳn dòng báo cáo khỏi database
  const handleDeleteReport = async () => {
    try {
      const res = await fetch(apiUrl(`admin/reports/${deleteModal.id}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        setReports(reports.filter(r => r.id !== deleteModal.id));
        showToast('Đã xóa báo cáo vĩnh viễn!');
        setDeleteModal({ isOpen: false, id: 0 });
      } else {
        showToast('Xóa thất bại, vui lòng thử lại.', 'error');
      }
    } catch (error) {
      showToast('Lỗi máy chủ, không thể xóa!', 'error');
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-bold animate-pulse">Đang tải dữ liệu báo cáo...</div>;

  return (
    <div className="relative animate-fade-in-up">
      
      {/* TOAST THÔNG BÁO */}
      {toast.isOpen && (
        <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up border ${
          toast.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toast.type === 'success' ? '✓' : '!'}
          </div>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* GIAO DIỆN QUẢN LÝ BÁO CÁO */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-red-50/30 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            Quản lý Báo cáo Vi phạm 
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
              {reports.filter(r => r.status === 'PENDING').length} chờ xử lý
            </span>
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {reports.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <div className="text-5xl mb-4">🛡️</div>
              <p className="font-bold text-lg">Hệ thống an toàn!</p>
              <p className="text-sm mt-1">Tuyệt vời, chưa có bất kỳ báo cáo vi phạm nào.</p>
            </div>
          ) : (
            reports.map((report) => (
              <SwipeableReportItem 
                key={report.id} 
                report={report} 
                handleResolveAndRemovePost={handleResolveAndRemovePost} 
                handleIgnoreReport={handleIgnoreReport} 
                setDeleteModal={setDeleteModal} 
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL XÁC NHẬN XÓA BÁO CÁO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
              <h3 className="font-extrabold text-gray-800 text-xl mb-2">Xóa báo cáo này?</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Hành động này sẽ xóa vĩnh viễn thông tin báo cáo này khỏi hệ thống.</p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, id: 0 })} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">Hủy bỏ</button>
              <button onClick={handleDeleteReport} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-500/30">Vâng, Xóa ngay!</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}