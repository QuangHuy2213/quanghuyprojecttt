'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

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
    fetch(apiUrl('admin/posts/pending'))
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
      const res = await fetch(apiUrl(`admin/posts/${approveData.id}/review`), {
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
      const res = await fetch(apiUrl(`admin/posts/${rejectData.id}/review`), {
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

  if (loading) return <div className="p-8 text-gray-500 font-bold">Đang tải dữ liệu bài đăng...</div>;

  return (
    <div className="relative animate-fade-in-up">
      
      {/* ======================= TOAST THÔNG BÁO ======================= */}
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

      {/* ======================= BẢNG DANH SÁCH BÀI ĐĂNG ======================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-extrabold text-gray-800">Kiểm duyệt Tin đăng ({posts.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold border-b border-gray-100">Tin đăng</th>
                <th className="p-4 font-bold border-b border-gray-100">Người đăng</th>
                <th className="p-4 font-bold border-b border-gray-100">Mức giá / Diện tích</th>
                <th className="p-4 font-bold border-b border-gray-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 flex items-start gap-4 max-w-sm">
                    <img 
                      src={post.thumbnail || 'https://via.placeholder.com/150'} 
                      alt="thumbnail" 
                      className="w-24 h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                    />
                    <div>
                      <a href={`/posts/${post.id}`} target="_blank" rel="noreferrer" className="font-bold text-gray-800 text-sm hover:text-[#1877F2] line-clamp-2 transition-colors">
                        {post.title}
                      </a>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-700">{post.user?.fullName || 'Không rõ'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{post.user?.email}</div>
                  </td>

                  <td className="p-4">
                    <div className="text-sm font-bold text-[#1877F2]">{formatPrice(post.price)} VNĐ</div>
                    <div className="text-xs text-gray-500 mt-0.5">{post.area} m²</div>
                  </td>

                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    {/* NÚT MỞ MODAL DUYỆT */}
                    <button 
                      onClick={() => openApproveModal(post.id, post.title, post.user?.fullName)}
                      className="bg-green-100 text-green-700 hover:bg-green-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      ✓ Duyệt
                    </button>
                    {/* NÚT MỞ MODAL TỪ CHỐI */}
                    <button 
                      onClick={() => openRejectModal(post.id)}
                      className="bg-red-100 text-red-700 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                    >
                      ✗ Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posts.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ✓
              </div>
              <h3 className="font-extrabold text-gray-800 text-xl mb-2">Xác nhận Duyệt bài</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h3 className="font-bold text-red-600 text-lg">Từ chối bài đăng</h3>
              <button onClick={() => setRejectData({ ...rejectData, isOpen: false })} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <form onSubmit={confirmReject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vui lòng cung cấp lý do từ chối để người dùng sửa lại: <span className="text-red-500">*</span>
                </label>
                <textarea 
                  required 
                  rows={4}
                  value={rejectData.reason}
                  onChange={e => setRejectData({ ...rejectData, reason: e.target.value })}
                  placeholder="Ví dụ: Hình ảnh mờ, giá không hợp lệ..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none bg-gray-50" 
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