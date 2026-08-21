'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States cho Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'USER'
  });

  const fetchUsers = () => {
    setLoading(true);
    fetch(apiUrl('admin/users'))
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchUsers(); }, []);

  // --- MỞ MODAL THÊM ---
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ email: '', password: '', fullName: '', phoneNumber: '', role: 'USER' });
    setIsModalOpen(true);
  };

  // --- MỞ MODAL SỬA ---
  const handleOpenEdit = (user: any) => {
    setModalMode('edit');
    setEditingId(user.id);
    setFormData({
      email: user.email, // Không cho sửa email để tránh lỗi
      password: '',      // Sửa thì không cần nhập lại pass
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  // --- XỬ LÝ LƯU (THÊM/SỬA) ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isCreate = modalMode === 'create';
      const url = isCreate ? apiUrl('admin/users') : apiUrl(`admin/users/${editingId}`);
      const method = isCreate ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert(isCreate ? 'Thêm người dùng thành công!' : 'Cập nhật thành công!');
        setIsModalOpen(false);
        fetchUsers(); // Tải lại danh sách
      } else {
        const errorData = await res.json();
        alert(`Lỗi: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Lỗi lưu user:", error);
    }
  };

  // --- XỬ LÝ XÓA ---
  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của ${name} không?`)) return;

    try {
      const res = await fetch(apiUrl(`admin/users/${userId}`), { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        alert('Đã xóa thành công!');
      }
    } catch (error) {
      console.error("Lỗi xóa user:", error);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-bold">Đang tải dữ liệu...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h2 className="text-lg font-extrabold text-gray-800">Danh sách Tài khoản ({users.length})</h2>
        <button onClick={handleOpenCreate} className="bg-[#1877F2] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-md">
          + Thêm người dùng
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="p-4 font-bold border-b border-gray-100">Khách hàng</th>
              <th className="p-4 font-bold border-b border-gray-100">Liên hệ</th>
              <th className="p-4 font-bold border-b border-gray-100">Phân quyền</th>
              <th className="p-4 font-bold border-b border-gray-100 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <img src={user.avatarUrl || 'https://i.imgur.com/L1nYE9z.jpg'} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  <div>
                    <div className="font-bold text-gray-800 text-sm">{user.fullName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">ID: {user.id.substring(0, 8)}...</div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-gray-700">{user.email}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{user.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    user.role === 'ADMIN' ? 'bg-red-50 text-red-600 border-red-200' :
                    user.role === 'AGENT' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleOpenEdit(user)} className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                    Sửa
                  </button>
                  <button onClick={() => handleDelete(user.id, user.fullName)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ======================= MODAL THÊM/SỬA ======================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-fade-in-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                {modalMode === 'create' ? 'Thêm người dùng mới' : 'Chỉnh sửa thông tin'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required 
                  disabled={modalMode === 'edit'} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none disabled:bg-gray-100" 
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                  <input 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none" 
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và Tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  value={formData.phoneNumber} 
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phân quyền</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none bg-white"
                >
                  <option value="USER">USER (Người dùng thường)</option>
                  <option value="AGENT">AGENT (Môi giới)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors">
                  Hủy
                </button>
                <button type="submit" className="flex-1 bg-[#1877F2] text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/30">
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}