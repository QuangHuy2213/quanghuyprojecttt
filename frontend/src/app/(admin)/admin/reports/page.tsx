'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
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
    <div className="relative mx-3 my-3 overflow-hidden rounded-[24px] border border-slate-200 bg-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg group">
      
      {/* 💥 LỚP ẨN BÊN DƯỚI: NÚT XÓA BÁO CÁO MÀU ĐỎ TƯƠI */}
      <div
        onClick={() => setDeleteModal({ isOpen: true, id: report.id })}
        className="absolute inset-y-0 right-0 z-0 flex w-[132px] cursor-pointer flex-col items-center justify-center bg-gradient-to-b from-rose-500 to-rose-600 text-white transition-colors hover:from-rose-600 hover:to-rose-700"
      >
        <span className="text-3xl mb-1">🗑️</span>
        <span className="text-sm font-bold">Xóa báo cáo</span>
      </div>

      {/* 📄 LỚP TRÊN: NỘI DUNG BÁO CÁO (CÓ THỂ TRƯỢT QUA LẠI) */}
      <div
        className={`relative z-10 flex w-full flex-col gap-6 p-6 transition-transform duration-300 ease-out md:flex-row md:group-hover:-translate-x-[132px] ${
          report.status === 'PENDING' ? 'bg-white' : 'bg-slate-50 text-slate-500'
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* CỘT 1: THÔNG TIN NGƯỜI BÁO CÁO */}
        <div className="md:w-1/4 flex-shrink-0">
          <div className="mb-2 text-sm font-extrabold text-slate-500">Người báo cáo</div>
          <div className="text-xl font-black tracking-tight text-slate-900">{report.user?.fullName || 'Ẩn danh'}</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600"><span>📧</span> {report.user?.email || 'Chưa có'}</div>
          <div className="mt-2 text-sm font-medium text-slate-400">{new Date(report.createdAt).toLocaleString('vi-VN')}</div>
        </div>

        {/* CỘT 2: NỘI DUNG BÁO CÁO */}
        <div className="md:w-2/4 flex-1">
          <div className="mb-2 text-sm font-extrabold text-slate-500">Mục tiêu bị báo cáo</div>
          {report.post ? (
            <Link href={`/posts/${report.post.id}`} target="_blank" className="mb-3 block text-base font-extrabold text-blue-700 hover:underline">
              Bài đăng: {report.post.title} ↗
            </Link>
          ) : (
            <span className="text-gray-400 italic text-sm block mb-2">Bài đăng đã bị xóa hoặc không còn tồn tại</span>
          )}
          
          <div className="mt-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-[15px] font-medium leading-7 text-rose-800">
            <span className="font-bold block mb-1">Lý do vi phạm:</span>
            {report.reason}
          </div>
        </div>

        {/* CỘT 3: TRẠNG THÁI & HÀNH ĐỘNG */}
        <div className="md:w-1/4 flex flex-col justify-between items-end pl-6 md:border-l border-gray-200 flex-shrink-0 pr-4">
          <div className="mb-4">
            {report.status === 'PENDING' ? (
              <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Chờ xử lý
              </span>
            ) : report.status === 'RESOLVED' ? (
              <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm">
                <span className="text-green-600 text-sm">✓</span> Đã giải quyết
              </span>
            ) : (
              <span className="bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm">
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5"
                  >
                    🗑️ Xóa bài & Giải quyết
                  </button>
                )}
                <button 
                  onClick={() => handleIgnoreReport(report.id)} 
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-200"
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
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'resolve' | 'ignore' | null;
    reportId: number;
    postId: number;
  }>({ isOpen: false, type: null, reportId: 0, postId: 0 });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
  };

  const fetchReports = () => {
    setLoading(true);
    apiFetch('admin/reports')
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

  // Mở popup xác nhận xử lý báo cáo
  const handleResolveAndRemovePost = (reportId: number, postId: number) => {
    setActionModal({ isOpen: true, type: 'resolve', reportId, postId });
  };

  const handleIgnoreReport = (id: number) => {
    setActionModal({ isOpen: true, type: 'ignore', reportId: id, postId: 0 });
  };

  const handleConfirmAction = async () => {
    const { type, reportId, postId } = actionModal;
    if (!type || !reportId) return;

    try {
      if (type === 'resolve') {
        const res = await apiFetch(`admin/reports/${reportId}/post/${postId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED', post: null } : r));
          showToast('Đã xóa bài viết và giải quyết báo cáo thành công!');
          setActionModal({ isOpen: false, type: null, reportId: 0, postId: 0 });
        } else {
          showToast('Có lỗi xảy ra khi xóa!', 'error');
        }
      } else {
        const res = await apiFetch(`admin/reports/${reportId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'IGNORED' }),
        });

        if (res.ok) {
          setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'IGNORED' } : r));
          showToast('Đã bỏ qua báo cáo.');
          setActionModal({ isOpen: false, type: null, reportId: 0, postId: 0 });
        } else {
          showToast('Có lỗi xảy ra!', 'error');
        }
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  // Xóa hẳn dòng báo cáo khỏi database
  const handleDeleteReport = async () => {
    try {
      const res = await apiFetch(`admin/reports/${deleteModal.id}`, {
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

  if (loading) return (
    <div className="flex h-80 flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-rose-600" />
      <div className="mt-4 text-base font-extrabold text-slate-800">Đang tải báo cáo vi phạm</div>
      <div className="mt-1 text-sm font-medium text-slate-400">Hệ thống đang đồng bộ dữ liệu báo cáo...</div>
    </div>
  );

  return (
    <div className="relative animate-fade-in-up">
      
      {/* TOAST THÔNG BÁO */}
      {toast.isOpen && (
        <div className={`fixed right-6 top-6 z-[100] flex max-w-md items-center gap-3 rounded-2xl border bg-white px-5 py-4 shadow-2xl animate-fade-in-up ${
          toast.type === 'success' ? 'bg-white border-green-500 text-green-700' : 'bg-white border-red-500 text-red-700'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toast.type === 'success' ? '✓' : '!'}
          </div>
          <span className="text-sm font-extrabold leading-6">{toast.message}</span>
        </div>
      )}

      {/* GIAO DIỆN QUẢN LÝ BÁO CÁO */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/50 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-rose-50/70 p-6 sm:p-7">
          <h2 className="flex flex-wrap items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            Quản lý Báo cáo Vi phạm 
            <span className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-extrabold text-rose-700">
              {reports.filter(r => r.status === 'PENDING').length} chờ xử lý
            </span>
          </h2>
        </div>

        <div className="p-1">
          {reports.length === 0 ? (
            <div className="m-4 rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
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

      {/* POPUP XÁC NHẬN XỬ LÝ / BỎ QUA BÁO CÁO */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)] animate-fade-in-up">
            <div className="p-7 text-center">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border text-2xl ${
                actionModal.type === 'resolve'
                  ? 'border-rose-100 bg-rose-50 text-rose-600'
                  : 'border-amber-100 bg-amber-50 text-amber-600'
              }`}>
                {actionModal.type === 'resolve' ? '🛡️' : '↩'}
              </div>
              <h3 className="mt-5 text-xl font-black tracking-tight text-slate-900">
                {actionModal.type === 'resolve' ? 'Xóa bài và giải quyết báo cáo?' : 'Bỏ qua báo cáo này?'}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {actionModal.type === 'resolve'
                  ? 'Bài viết vi phạm sẽ bị xóa và báo cáo được chuyển sang trạng thái đã giải quyết.'
                  : 'Báo cáo sẽ được đánh dấu là đã bỏ qua và không còn nằm trong danh sách chờ xử lý.'}
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <button
                onClick={() => setActionModal({ isOpen: false, type: null, reportId: 0, postId: 0 })}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-100"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 rounded-2xl py-3.5 text-sm font-extrabold text-white shadow-lg transition-all ${
                  actionModal.type === 'resolve'
                    ? 'bg-rose-600 shadow-rose-500/20 hover:bg-rose-700'
                    : 'bg-amber-500 shadow-amber-500/20 hover:bg-amber-600'
                }`}
              >
                {actionModal.type === 'resolve' ? 'Xóa & giải quyết' : 'Bỏ qua'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA BÁO CÁO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)] animate-fade-in-up">
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
              <h3 className="mb-2 text-xl font-black text-slate-900">Xóa báo cáo này?</h3>
              <p className="text-sm font-medium leading-6 text-slate-600">Hành động này sẽ xóa vĩnh viễn thông tin báo cáo này khỏi hệ thống.</p>
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
