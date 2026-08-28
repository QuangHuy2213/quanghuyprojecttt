'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

type PopupKind = 'success' | 'error' | 'warning' | 'confirm';

type PopupState = {
  type: PopupKind;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
};

function AdminSystemPopup({ popup, onClose }: { popup: PopupState; onClose: () => void }) {
  const isConfirm = popup.type === 'confirm';

  const theme = {
    success: {
      wrap: 'border-emerald-100 bg-emerald-50 text-emerald-600',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
    error: {
      wrap: 'border-rose-100 bg-rose-50 text-rose-600',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="m9 9 6 6M15 9l-6 6" />
        </svg>
      ),
    },
    warning: {
      wrap: 'border-amber-100 bg-amber-50 text-amber-600',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 2.8 19a1.5 1.5 0 001.3 2.25h15.8A1.5 1.5 0 0021.2 19L12 3z" />
          <path strokeLinecap="round" d="M12 9v4M12 17h.01" />
        </svg>
      ),
    },
    confirm: {
      wrap: 'border-blue-100 bg-blue-50 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20',
      icon: (
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-3z" />
          <path strokeLinecap="round" d="M9.5 12 11 13.5l3.5-4" />
        </svg>
      ),
    },
  }[popup.type];

  const handleConfirm = () => {
    const action = popup.onConfirm;
    onClose();
    action?.();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)]">
        <div className="p-7 sm:p-8">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border ${theme.wrap}`}>
            {theme.icon}
          </div>

          <div className="mt-5 text-center">
            <h3 className="text-xl font-black tracking-tight text-slate-900">{popup.title}</h3>
            <p className="mt-2 whitespace-pre-line text-sm font-medium leading-6 text-slate-600">{popup.message}</p>
          </div>

          <div className={`mt-7 flex ${isConfirm ? 'gap-3' : ''}`}>
            {isConfirm && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                {popup.cancelText || 'Hủy bỏ'}
              </button>
            )}

            <button
              type="button"
              onClick={isConfirm ? handleConfirm : onClose}
              className={`flex-1 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] ${theme.button}`}
            >
              {isConfirm ? popup.confirmText || 'Xác nhận' : 'Đã hiểu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [popup, setPopup] = useState<PopupState | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    role: 'USER',
  });

  const showMessage = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    setPopup({ type, title, message });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    confirmText = 'Xác nhận'
  ) => {
    setPopup({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText: 'Hủy bỏ',
      onConfirm,
    });
  };

  const fetchUsers = () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');

    fetch(apiUrl('admin/users'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({ email: '', password: '', fullName: '', phoneNumber: '', role: 'USER' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    setModalMode('edit');
    setEditingId(user.id);
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const isCreate = modalMode === 'create';
      const url = isCreate ? apiUrl('admin/users') : apiUrl(`admin/users/${editingId}`);
      const method = isCreate ? 'POST' : 'PATCH';
      const token = localStorage.getItem('access_token');

      let payload = {};
      if (isCreate) {
        payload = formData;
      } else {
        payload = {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          role: formData.role,
        };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
        showMessage(
          'success',
          isCreate ? 'Thêm người dùng thành công' : 'Cập nhật thành công',
          isCreate
            ? 'Tài khoản mới đã được tạo và cập nhật vào danh sách.'
            : 'Thông tin tài khoản đã được lưu thành công.'
        );
      } else {
        const errorData = await res.json();
        showMessage(
          'error',
          'Không thể lưu tài khoản',
          errorData.message || errorData.error || 'Đã xảy ra lỗi khi xử lý yêu cầu.'
        );
      }
    } catch (error) {
      console.error('Lỗi lưu user:', error);
      showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    }
  };

  const handleToggleLock = (user: any) => {
    const isCurrentlyLocked = user.isLocked;

    showConfirm(
      isCurrentlyLocked ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?',
      isCurrentlyLocked
        ? `Bạn có chắc chắn muốn mở khóa tài khoản của ${user.fullName}?`
        : `Tài khoản ${user.fullName} sẽ không thể đăng nhập vào hệ thống sau khi bị khóa.`,
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(apiUrl(`admin/users/${user.id}`), {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ isLocked: !isCurrentlyLocked }),
          });

          if (res.ok) {
            setUsers((prevUsers) =>
              prevUsers.map((u) => (u.id === user.id ? { ...u, isLocked: !isCurrentlyLocked } : u))
            );
            showMessage(
              'success',
              isCurrentlyLocked ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
              isCurrentlyLocked
                ? `${user.fullName} có thể đăng nhập lại vào hệ thống.`
                : `${user.fullName} đã bị khóa và không thể đăng nhập.`
            );
          } else {
            const errorData = await res.json().catch(() => ({}));
            showMessage('error', 'Thao tác thất bại', errorData.message || 'Không thể thay đổi trạng thái tài khoản.');
          }
        } catch (error) {
          console.error('Lỗi khóa/mở khóa user:', error);
          showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        }
      },
      isCurrentlyLocked ? 'Mở khóa' : 'Khóa tài khoản'
    );
  };

  const handleDelete = (userId: string, name: string) => {
    showConfirm(
      'Xóa vĩnh viễn tài khoản?',
      `Bạn sắp xóa tài khoản ${name}.\nHành động này có thể xóa toàn bộ bài đăng liên quan và không thể hoàn tác.`,
      async () => {
        try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(apiUrl(`admin/users/${userId}`), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.ok) {
            setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
            showMessage('success', 'Đã xóa tài khoản', `Tài khoản ${name} đã được xóa khỏi hệ thống.`);
          } else {
            const errorData = await res.json().catch(() => ({}));
            showMessage('error', 'Không thể xóa tài khoản', errorData.message || 'Máy chủ từ chối yêu cầu xóa tài khoản.');
          }
        } catch (error) {
          console.error('Lỗi xóa user:', error);
          showMessage('error', 'Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng thử lại.');
        }
      },
      'Xóa tài khoản'
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="relative flex h-96 flex-col items-center justify-center overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_45px_-28px_rgba(15,23,42,0.28)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
          <svg className="h-7 w-7 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M21 12a9 9 0 00-9-9v3a6 6 0 016 6h3z" />
          </svg>
        </div>
        <h3 className="mt-5 text-base font-extrabold text-slate-900">Đang tải danh sách tài khoản</h3>
        <p className="mt-1.5 text-sm font-medium text-slate-500">Dữ liệu hệ thống đang được đồng bộ...</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-50/70 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.32)]">
      {popup && <AdminSystemPopup popup={popup} onClose={() => setPopup(null)} />}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      <div className="border-b border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>

            <div>
              <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-700">
                Quản trị hệ thống
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Quản lý Tài khoản</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                Đang quản lý <span className="font-extrabold text-blue-700">{users.length}</span> người dùng trong hệ thống
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative min-w-0 flex-1 sm:min-w-[300px]">
              <svg className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc thư điện tử..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <button
              onClick={handleOpenCreate}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/15">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
              Thêm mới
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-500">
                <th className="px-5 py-2">Thành viên</th>
                <th className="px-5 py-2">Thông tin liên hệ</th>
                <th className="px-5 py-2">Phân quyền</th>
                <th className="px-5 py-2 text-right">Thao tác hệ thống</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" d="m20 20-3.5-3.5M8.5 11h5" />
                      </svg>
                    </div>
                    <p className="mt-4 text-base font-extrabold text-slate-800">Không tìm thấy người dùng</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">Thử tìm kiếm bằng tên hoặc địa chỉ thư điện tử khác.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group">
                    <td className={`rounded-l-3xl border-y border-l px-5 py-4 shadow-sm transition-all ${user.isLocked ? 'border-slate-200 bg-slate-100/90' : 'border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50/30'}`}>
                      <div className="flex items-center gap-4">
                        <img
                          src={user.avatarUrl || 'https://i.imgur.com/L1nYE9z.jpg'}
                          alt="avatar"
                          className={`h-12 w-12 flex-shrink-0 rounded-2xl border border-slate-200 bg-white object-cover shadow-sm ${user.isLocked ? 'grayscale opacity-60' : ''}`}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`max-w-[220px] truncate text-base font-extrabold ${user.isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
                              {user.fullName}
                            </span>
                            {user.isLocked && (
                              <span className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">Đã khóa</span>
                            )}
                          </div>
                          <div className="mt-1 max-w-[240px] truncate font-mono text-xs font-semibold text-slate-500">Mã: {user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className={`border-y px-5 py-4 shadow-sm transition-all ${user.isLocked ? 'border-slate-200 bg-slate-100/90' : 'border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50/30'}`}>
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2.5 text-sm font-bold ${user.isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <rect x="3" y="5" width="18" height="14" rx="2" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9 6 9-6" />
                            </svg>
                          </span>
                          <span className="max-w-[250px] truncate">{user.email}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-600">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8 9.73a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z" />
                            </svg>
                          </span>
                          {user.phoneNumber || 'Chưa cập nhật SĐT'}
                        </div>
                      </div>
                    </td>

                    <td className={`border-y px-5 py-4 shadow-sm transition-all ${user.isLocked ? 'border-slate-200 bg-slate-100/90' : 'border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50/30'}`}>
                      <span className={`inline-flex items-center rounded-xl border px-3.5 py-2 text-sm font-extrabold shadow-sm ${
                        user.role === 'ADMIN'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : user.role === 'AGENT'
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700'
                      } ${user.isLocked ? 'opacity-60' : ''}`}>
                        {user.role === 'ADMIN'
                          ? 'Quản trị viên'
                          : user.role === 'AGENT'
                            ? 'Môi giới'
                            : 'Người dùng'}
                      </span>
                    </td>

                    <td className={`rounded-r-3xl border-y border-r px-5 py-4 text-right shadow-sm transition-all ${user.isLocked ? 'border-slate-200 bg-slate-100/90' : 'border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50/30'}`}>
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                        <button
                          onClick={() => handleToggleLock(user)}
                          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition-all active:scale-95 ${
                            user.isLocked
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          }`}
                          title={user.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {user.isLocked ? 'Mở khóa' : 'Khóa'}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="inline-flex h-9 items-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700 transition-all hover:bg-blue-100 active:scale-95"
                        >
                          Sửa
                        </button>

                        <button
                          onClick={() => handleDelete(user.id, user.fullName)}
                          className="inline-flex h-9 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition-all hover:bg-rose-100 active:scale-95"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
        <p className="text-sm font-semibold text-slate-600">
          Hiển thị <span className="font-extrabold text-slate-900">{filteredUsers.length}</span> / {users.length} tài khoản
        </p>
        <span className="text-sm font-semibold text-slate-500">Dữ liệu đã tải</span>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)]">
            <div className="border-b border-slate-200 bg-slate-50 p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                    {modalMode === 'create' ? (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4z" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-950">
                      {modalMode === 'create' ? 'Thêm thành viên mới' : 'Cập nhật thông tin'}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {modalMode === 'create'
                        ? 'Tạo tài khoản mới và thiết lập quyền truy cập.'
                        : 'Chỉnh sửa thông tin và phân quyền của tài khoản.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Đóng"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-5 p-6 sm:p-7">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Địa chỉ thư điện tử <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  disabled={modalMode === 'edit'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@domain.com"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              {modalMode === 'create' && (
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Mật khẩu <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Ít nhất 6 ký tự bảo mật"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Họ và Tên <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Số điện thoại</label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="0912345678"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Phân quyền tài khoản</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="h-12 w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="USER">Người dùng thường</option>
                  <option value="AGENT">Môi giới bất động sản</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>

              <div className="flex gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.98]"
                >
                  {modalMode === 'create' ? 'Tạo tài khoản' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
