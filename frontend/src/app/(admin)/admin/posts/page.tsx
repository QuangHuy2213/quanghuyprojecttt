'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- THÔNG BÁO GÓC MÀN HÌNH (Thay thế alert) ---
  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000); // Tự tắt sau 3 giây
  };

  // --- STATE CHO MODAL DUYỆT BÀI ---
  const [approveData, setApproveData] = useState({ isOpen: false, id: 0, title: '', author: '' });

  // --- STATE CHO MODAL TỪ CHỐI ---
  const [rejectData, setRejectData] = useState({ isOpen: false, id: 0, reason: '' });

  // 1. Tải danh sách bài chờ duyệt
  const fetchPendingPosts = () => {
    setLoading(true);
    apiFetch('admin/posts/pending')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPosts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải danh sách:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchPendingPosts(); }, []);

  // 2. Mở Modal Duyệt bài (Thay cho confirm)
  const openApproveModal = (postId: number, title: string, authorName: string) => {
    setApproveData({ isOpen: true, id: postId, title, author: authorName || 'Người dùng ẩn danh' });
  };

  // 2.1. Xác nhận Duyệt bài gọi API
  const confirmApprove = async () => {
    try {
      const res = await apiFetch(`admin/posts/${approveData.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (res.ok) {
        showToast('Đã duyệt bài đăng thành công!');
        setPosts(posts.filter(p => p.id !== approveData.id)); 
        setApproveData({ ...approveData, isOpen: false }); // Đóng modal
      }
    } catch (error) {
      console.error("Lỗi duyệt bài:", error);
      showToast('Có lỗi xảy ra khi duyệt bài!', 'error');
    }
  };

  // 3. Mở Modal Từ chối
  const openRejectModal = (postId: number) => {
    setRejectData({ isOpen: true, id: postId, reason: '' });
  };

  // 3.1. Xác nhận Từ chối gọi API
  const confirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectData.id || !rejectData.reason.trim()) return;

    try {
      const res = await apiFetch(`admin/posts/${rejectData.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'HIDDEN', reason: rejectData.reason }),
      });

      if (res.ok) {
        showToast('Đã từ chối bài đăng & gửi thông báo cho tác giả!');
        setPosts(posts.filter(p => p.id !== rejectData.id)); 
        setRejectData({ ...rejectData, isOpen: false }); // Đóng modal
      }
    } catch (error) {
      console.error("Lỗi từ chối bài:", error);
      showToast('Có lỗi xảy ra khi từ chối bài!', 'error');
    }
  };

  const formatPrice = (price: any) => {
    if (!price) return 'Đang cập nhật';
    return Number(price).toLocaleString('vi-VN');
  };

  if (loading) return (
    <div className="flex h-80 flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
      <div className="mt-4 text-base font-extrabold text-slate-800">Đang tải bài đăng chờ duyệt</div>
      <div className="mt-1 text-sm font-medium text-slate-400">Hệ thống đang lấy dữ liệu kiểm duyệt...</div>
    </div>
  );

  return (
    <div className="relative animate-fade-in-up">
      
      {/* ======================= TOAST THÔNG BÁO ======================= */}
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

      {/* ======================= BẢNG DANH SÁCH BÀI ĐĂNG ======================= */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50/60 p-6 sm:p-7">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Kiểm duyệt Tin đăng ({posts.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-sm font-extrabold text-slate-500">
                <th className="border-b border-slate-200 px-5 py-4 font-extrabold">Tin đăng</th>
                <th className="border-b border-slate-200 px-5 py-4 font-extrabold">Người đăng</th>
                <th className="border-b border-slate-200 px-5 py-4 font-extrabold">Mức giá / Diện tích</th>
                <th className="border-b border-slate-200 px-5 py-4 text-right font-extrabold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="transition-colors hover:bg-blue-50/40">
                  <td className="flex max-w-md items-start gap-4 px-5 py-5">
                    <img 
                      src={post.thumbnail || 'https://via.placeholder.com/150'} 
                      alt="thumbnail" 
                      className="h-24 w-28 flex-shrink-0 rounded-2xl border border-slate-200 object-cover shadow-sm"
                    />
                    <div>
                      <a href={`/posts/${post.id}`} target="_blank" rel="noreferrer" className="line-clamp-2 text-base font-black leading-6 text-slate-900 transition-colors hover:text-blue-700">
                        {post.title}
                      </a>
                      <div className="mt-2 text-sm font-medium text-slate-400">
                        {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-5 py-5">
                    <div className="text-[15px] font-extrabold text-slate-800">{post.user?.fullName || 'Không rõ'}</div>
                    <div className="mt-1 text-sm font-medium text-slate-500">{post.user?.email}</div>
                  </td>

                  <td className="px-5 py-5">
                    <div className="text-base font-black text-blue-700">{formatPrice(post.price)} VNĐ</div>
                    <div className="mt-1 text-sm font-medium text-slate-500">{post.area} m²</div>
                  </td>

                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {/* NÚT MỞ MODAL DUYỆT */}
                    <button 
                      onClick={() => openApproveModal(post.id, post.title, post.user?.fullName)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white"
                    >
                      ✓ Duyệt
                    </button>
                    {/* NÚT MỞ MODAL TỪ CHỐI */}
                    <button 
                      onClick={() => openRejectModal(post.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700 shadow-sm transition-all hover:bg-rose-600 hover:text-white"
                    >
                      ✗ Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posts.length === 0 && (
            <div className="m-5 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-12 text-slate-400">
              <span className="text-4xl mb-3">🎉</span>
              <p className="font-bold">Tuyệt vời!</p>
              <p className="text-sm">Hiện không có bài đăng nào cần duyệt.</p>
            </div>
          )}
        </div>
      </div>

      {/* ======================= MODAL XÁC NHẬN DUYỆT ======================= */}
      {approveData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)] animate-fade-in-up">
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ✓
              </div>
              <h3 className="mb-2 text-xl font-black text-slate-900">Xác nhận Duyệt bài</h3>
              <p className="text-sm font-medium leading-6 text-slate-600">
                Bạn có chắc chắn muốn duyệt hiển thị bài đăng <br/>
                <span className="font-bold text-gray-800">"{approveData.title}"</span> <br/>
                của tác giả <span className="font-bold text-[#1877F2]">"{approveData.author}"</span> không?
              </p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button onClick={() => setApproveData({ ...approveData, isOpen: false })} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">
                Hủy bỏ
              </button>
              <button onClick={confirmApprove} className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-500/30">
                Xác nhận Duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL TỪ CHỐI ======================= */}
      {rejectData.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)] animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-50 to-white p-6">
              <h3 className="text-xl font-black text-rose-700">Từ chối bài đăng</h3>
              <button onClick={() => setRejectData({ ...rejectData, isOpen: false })} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <form onSubmit={confirmReject} className="p-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-extrabold leading-6 text-slate-700">
                  Vui lòng cung cấp lý do từ chối để người dùng sửa lại: <span className="text-red-500">*</span>
                </label>
                <textarea 
                  required 
                  rows={4}
                  value={rejectData.reason}
                  onChange={e => setRejectData({ ...rejectData, reason: e.target.value })}
                  placeholder="Ví dụ: Hình ảnh mờ, giá không hợp lệ..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] font-medium leading-6 text-slate-700 outline-none transition-all focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setRejectData({ ...rejectData, isOpen: false })} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                  Hủy bỏ
                </button>
                <button type="submit" className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-500/30">
                  Xác nhận Từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
