'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    const token = localStorage.getItem('access_token'); // 🌟 THÊM TOKEN
    
    fetch(apiUrl('admin/users'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
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
      email: user.email,
      password: '',
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role
    });
    setIsModalOpen(true);
  };

  // --- 🌟 ĐÃ SỬA: XỬ LÝ LƯU (THÊM/SỬA) 🌟 ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isCreate = modalMode === 'create';
      const url = isCreate ? apiUrl('admin/users') : apiUrl(`admin/users/${editingId}`);
      const method = isCreate ? 'POST' : 'PATCH';
      const token = localStorage.getItem('access_token'); // Lấy token
      
      // 🌟 LỌC DỮ LIỆU: Chỉ gửi những trường được phép
      let payload = {};
      if (isCreate) {
        payload = formData; // Thêm mới thì gửi tất cả
      } else {
        // Chế độ Sửa (PATCH): Bỏ email và password ra khỏi cục dữ liệu gửi lên
        payload = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          role: formData.role
        };
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Gửi kèm token
        },
        body: JSON.stringify(payload), // Gửi payload đã lọc sạch
      });

      if (res.ok) {
        alert(isCreate ? '✨ Thêm người dùng thành công!' : '✨ Cập nhật thành công!');
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const errorData = await res.json();
        alert(`Lỗi: ${errorData.message || errorData.error}`);
      }
    } catch (error) {
      console.error("Lỗi lưu user:", error);
    }
  };

  // --- 🌟 ĐÃ SỬA: XỬ LÝ KHÓA / MỞ KHÓA 🌟 ---
  const handleToggleLock = async (user: any) => {
    const isCurrentlyLocked = user.isLocked;
    const confirmMessage = isCurrentlyLocked 
      ? `Bạn có chắc chắn muốn MỞ KHÓA tài khoản của ${user.fullName}?` 
      : `⚠️ CẢNH BÁO: Khóa tài khoản ${user.fullName}? Người này sẽ không thể đăng nhập vào hệ thống.`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('access_token'); // Lấy token
      
      const res = await fetch(apiUrl(`admin/users/${user.id}`), {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isLocked: !isCurrentlyLocked }), // Đã lọc sạch, chỉ gửi isLocked
      });

      if (res.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, isLocked: !isCurrentlyLocked } : u));
      } else {
        const errorData = await res.json();
        alert(`Lỗi: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Lỗi khóa/mở khóa user:", error);
    }
  };

  // --- 🌟 ĐÃ SỬA: XỬ LÝ XÓA 🌟 ---
  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`🗑️ CẢNH BÁO: Xóa vĩnh viễn tài khoản ${name}? Hành động này sẽ xóa toàn bộ bài đăng liên quan!`)) return;

    try {
      const token = localStorage.getItem('access_token'); // Lấy token
      const res = await fetch(apiUrl(`admin/users/${userId}`), { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error("Lỗi xóa user:", error);
    }
  };

  // Lọc danh sách theo ô tìm kiếm
  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm font-bold text-gray-600 tracking-wide animate-pulse">Đang tải dữ liệu hệ thống, vui lòng chờ...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden transition-all duration-300">
      
      {/* HEADER SECTION */}
      <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-50/50 to-white">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Quản lý Tài khoản</h2>
          <p className="text-xs text-gray-500 mt-1">Tổng số: <span className="font-bold text-blue-600">{users.length}</span> người dùng trong hệ thống</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Thanh tìm kiếm nhỏ */}
          <input 
            type="text"
            placeholder="Tìm kiếm thành viên..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none w-full sm:w-64 transition-all"
          />
          <button 
            onClick={handleOpenCreate} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 whitespace-nowrap active:scale-95"
          >
            <span className="text-base leading-none">+</span> Thêm mới
          </button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/70 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
              <th className="py-4 px-6">Thành viên</th>
              <th className="py-4 px-6">Thông tin liên hệ</th>
              <th className="py-4 px-6">Phân quyền</th>
              <th className="py-4 px-6 text-right">Thao tác hệ thống</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400 text-xs">Không tìm thấy người dùng phù hợp.</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className={`transition-all hover:bg-blue-50/20 ${user.isLocked ? 'bg-gray-50/60' : ''}`}>
                  
                  {/* Cột Khách hàng */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      <div className="relative flex-shrink-0">
                        <img 
                          src={user.avatarUrl || 'https://i.imgur.com/L1nYE9z.jpg'} 
                          alt="avatar" 
                          className={`w-11 h-11 rounded-2xl object-cover shadow-sm border border-gray-100 transition-all ${user.isLocked ? 'grayscale opacity-50' : ''}`} 
                        />
                        {user.isLocked && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full shadow-md border-2 border-white">
                            🔒
                          </span>
                        )}
                      </div>
                      <div>
                        <div className={`font-bold text-sm tracking-tight ${user.isLocked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {user.fullName}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột Liên hệ */}
                  <td className="py-4 px-6">
                    <div className={`text-xs font-medium ${user.isLocked ? 'text-gray-400' : 'text-gray-800'}`}>{user.email}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{user.phoneNumber || 'Chưa cập nhật SĐT'}</div>
                  </td>

                  {/* Cột Phân quyền */}
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black tracking-wide border ${
                      user.role === 'ADMIN' ? 'bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/10' :
                      user.role === 'AGENT' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm shadow-blue-500/10' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    } ${user.isLocked ? 'opacity-40' : ''}`}>
                      {user.role}
                    </span>
                  </td>

                  {/* Cột Hành động */}
                  <td className="py-4 px-6 text-right space-x-1.5">
                    <button 
                      onClick={() => handleToggleLock(user)} 
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                        user.isLocked 
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200' 
                          : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                      }`}
                      title={user.isLocked ? "Mở khóa tài khoản" : "Khóa tài khoản"}
                    >
                      {user.isLocked ? '🔓 Mở' : '🔒 Khóa'}
                    </button>

                    <button 
                      onClick={() => handleOpenEdit(user)} 
                      className="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Sửa
                    </button>
                    
                    <button 
                      onClick={() => handleDelete(user.id, user.fullName)} 
                      className="text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                    >
                      Xóa
                    </button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ======================= MODAL THÊM / SỬA (DESIGN MỚI) ======================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-scale-up">
            
            <div className="p-6 sm:p-7 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-black text-gray-900 text-lg">
                  {modalMode === 'create' ? 'Thêm thành viên mới' : 'Cập nhật thông tin'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Điền đầy đủ thông tin bên dưới để tiếp tục.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-gray-200/60 flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600 font-bold transition-all"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 sm:p-7 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Địa chỉ Email <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  required 
                  disabled={modalMode === 'edit'} 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="example@domain.com"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none disabled:bg-gray-100 disabled:text-gray-400 transition-all" 
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Mật khẩu <span className="text-red-500">*</span></label>
                  <input 
                    type="password" 
                    required 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="Ít nhất 6 ký tự bảo mật"
                    className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.fullName} 
                  onChange={e => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Số điện thoại</label>
                <input 
                  type="text" 
                  value={formData.phoneNumber} 
                  onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                  placeholder="0912345678"
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Phân quyền tài khoản</label>
                <select 
                  value={formData.role} 
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
                >
                  <option value="USER">USER (Người dùng thường)</option>
                  <option value="AGENT">AGENT (Môi giới bất động sản)</option>
                  <option value="ADMIN">ADMIN (Quản trị viên tối cao)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-all text-xs"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 text-xs active:scale-95"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}