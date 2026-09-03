'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';

// 🌟 BƯỚC 1: TẠO COMPONENT THÔNG MINH CHO TỪNG BỨC THƯ (HỖ TRỢ KÉO/VUỐT)
const SwipeableContactItem = ({ contact, openEmailModal, openConfirmModal, setDeleteModal }: any) => {
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
  useEffect(() => { setOffsetX(0); }, [contact]);

  return (
    <div className="relative mx-3 my-3 overflow-hidden rounded-[24px] border border-slate-200 bg-rose-600 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg group">
      
      {/* 💥 LỚP ẨN BÊN DƯỚI: NÚT XÓA MÀU ĐỎ TƯƠI */}
      <div
        onClick={() => setDeleteModal({ isOpen: true, id: contact.id })}
        className="absolute inset-y-0 right-0 z-0 flex w-[132px] cursor-pointer flex-col items-center justify-center bg-gradient-to-b from-rose-500 to-rose-600 text-white transition-colors hover:from-rose-600 hover:to-rose-700"
      >
        <span className="text-3xl mb-1">🗑️</span>
        <span className="text-sm font-bold">Xóa thư</span>
      </div>

      {/* 📄 LỚP TRÊN: NỘI DUNG BỨC THƯ (CÓ THỂ TRƯỢT QUA LẠI) */}
      <div
        className={`relative z-10 flex w-full flex-col gap-6 p-6 transition-transform duration-300 ease-out md:flex-row md:group-hover:-translate-x-[132px] ${
          contact.status === 'PENDING' ? 'bg-white' : 'bg-slate-50 text-slate-500'
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* CỘT 1: THÔNG TIN KHÁCH */}
        <div className="flex-shrink-0 md:w-1/4">
          <div className="text-xl font-black tracking-tight text-slate-900">{contact.fullName}</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600"><span>📧</span> {contact.email}</div>
          <div className="mt-2 text-sm font-medium text-slate-400">{new Date(contact.createdAt).toLocaleString('vi-VN')}</div>
        </div>

        {/* CỘT 2: NỘI DUNG THƯ */}
        <div className="flex-1 md:w-2/4">
          <div className="mb-3 inline-flex rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-extrabold text-slate-700">
            Chủ đề: {contact.subject}
          </div>
          <p className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-[15px] font-medium leading-7 text-slate-700">
            {contact.message}
          </p>
        </div>

        {/* CỘT 3: TRẠNG THÁI & HÀNH ĐỘNG */}
        <div className="flex flex-shrink-0 flex-col justify-between md:w-1/4 md:border-l md:border-slate-200 md:pl-6">
          <div className="mb-4">
            {contact.status === 'PENDING' ? (
              <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Chưa xử lý
              </span>
            ) : (
              <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-extrabold inline-flex items-center gap-1.5 shadow-sm">
                <span className="text-green-600 text-sm">✓</span> Đã giải quyết
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full mt-auto">
            {contact.status === 'PENDING' && (
              <>
                <button onClick={() => openEmailModal(contact)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-extrabold text-blue-700 transition-all hover:bg-blue-100">
                  ✉️ Gửi thư
                </button>
                <button onClick={() => openConfirmModal(contact.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5">
                  ✓ Đánh dấu xử lý
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

// 🌟 BƯỚC 2: TRANG QUẢN LÝ CHÍNH
export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: 0 });
  const [emailModal, setEmailModal] = useState({ isOpen: false, contactId: 0, email: '', subject: '', message: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: 0 }); 
  const [isSending, setIsSending] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, isOpen: false })), 3000);
  };

  const fetchContacts = () => {
    setLoading(true);
    apiFetch('admin/contacts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setContacts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải liên hệ:", err);
        setLoading(false);
      });
  };

  useEffect(() => { fetchContacts(); }, []);

  const openConfirmModal = (id: number) => setConfirmModal({ isOpen: true, id });
  const openEmailModal = (contact: any) => {
    setEmailModal({
      isOpen: true,
      contactId: contact.id,
      email: contact.email,
      subject: `Phản hồi yêu cầu: ${contact.subject}`,
      message: `Chào ${contact.fullName},\n\nNhà Tốt đã nhận được yêu cầu của bạn về vấn đề: "${contact.subject}".\n\n[Nhập nội dung phản hồi của bạn vào đây...]\n\nTrân trọng,\nĐội ngũ quản trị Nhà Tốt.`
    });
  };

  const handleMarkAsReplied = async () => {
    try {
      const res = await apiFetch(`admin/contacts/${confirmModal.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REPLIED' }),
      });

      if (res.ok) {
        setContacts(contacts.map(c => c.id === confirmModal.id ? { ...c, status: 'REPLIED' } : c));
        showToast('Đã đánh dấu xử lý thành công!');
        setConfirmModal({ isOpen: false, id: 0 }); 
      } else {
        showToast('Có lỗi xảy ra khi cập nhật!', 'error');
      }
    } catch (error) {
      showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  const handleDeleteContact = async () => {
    try {
      const res = await apiFetch(`admin/contacts/${deleteModal.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setContacts(contacts.filter(c => c.id !== deleteModal.id));
        showToast('Đã xóa thư vĩnh viễn!');
        setDeleteModal({ isOpen: false, id: 0 });
      } else {
        showToast('Xóa thất bại, vui lòng thử lại.', 'error');
      }
    } catch (error) {
      showToast('Lỗi máy chủ, không thể xóa!', 'error');
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const res = await apiFetch('admin/contacts/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailModal),
      });

      if (res.ok) {
        showToast('Gửi thư phản hồi thành công!');
        setContacts(contacts.map(c => c.id === emailModal.contactId ? { ...c, status: 'REPLIED' } : c));
        setEmailModal({ ...emailModal, isOpen: false }); 
      } else {
        showToast('Gửi thư thất bại, vui lòng thử lại.', 'error');
      }
    } catch (error) {
      showToast('Lỗi máy chủ, không thể gửi thư!', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="flex h-80 flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600" />
      <div className="mt-4 text-base font-extrabold text-slate-800">Đang tải hộp thư hỗ trợ</div>
      <div className="mt-1 text-sm font-medium text-slate-400">Vui lòng chờ hệ thống đồng bộ dữ liệu...</div>
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

      {/* GIAO DIỆN HỘP THƯ */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/50 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50/60 p-6 sm:p-7">
          <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
            Hộp thư Hỗ trợ <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-blue-700">{contacts.length}</span>
          </h2>
        </div>

        <div className="p-1">
          {contacts.length === 0 ? (
            <div className="m-4 rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center text-slate-400">
              <div className="text-5xl mb-4">📭</div>
              <p className="font-bold text-lg">Hộp thư trống!</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <SwipeableContactItem 
                key={contact.id} 
                contact={contact} 
                openEmailModal={openEmailModal} 
                openConfirmModal={openConfirmModal} 
                setDeleteModal={setDeleteModal} 
              />
            ))
          )}
        </div>
      </div>

      {/* MODAL SOẠN EMAIL TRỰC TIẾP */}
      {emailModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)] animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50 p-6">
              <h3 className="flex items-center gap-2 text-xl font-black text-slate-900">✉️ Soạn thư phản hồi</h3>
              <button onClick={() => setEmailModal({ ...emailModal, isOpen: false })} className="text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSendEmail} className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">Gửi đến (To)</label>
                  <input type="text" readOnly value={emailModal.email} className="w-full bg-gray-100 border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] text-gray-500 font-medium" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">Chủ đề (Subject)</label>
                  <input type="text" required value={emailModal.subject} onChange={e => setEmailModal({...emailModal, subject: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] focus:ring-2 focus:ring-[#1877F2] outline-none font-bold text-gray-800" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-extrabold text-slate-700">Nội dung thư</label>
                  <textarea required rows={8} value={emailModal.message} onChange={e => setEmailModal({...emailModal, message: e.target.value})} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] focus:ring-2 focus:ring-[#1877F2] outline-none resize-none leading-relaxed text-gray-700" />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setEmailModal({ ...emailModal, isOpen: false })} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                <button type="submit" disabled={isSending} className="flex-1 bg-[#1877F2] text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70">
                  {isSending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang gửi...</> : '✈️ Gửi thư ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN (Đánh dấu thủ công) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-up">
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-blue-100 text-[#1877F2] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📬</div>
              <h3 className="mb-2 text-xl font-black text-slate-900">Xác nhận xử lý</h3>
              <p className="text-sm font-medium leading-6 text-slate-600">Bạn đã phản hồi và muốn đóng yêu cầu hỗ trợ này lại?</p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button onClick={() => setConfirmModal({ isOpen: false, id: 0 })} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">Hủy bỏ</button>
              <button onClick={handleMarkAsReplied} className="flex-1 bg-[#1877F2] text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/30">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA THƯ */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in-up">
            <div className="p-7 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
              <h3 className="mb-2 text-xl font-black text-slate-900">Xóa thư này?</h3>
              <p className="text-sm font-medium leading-6 text-slate-600">Hành động này sẽ xóa vĩnh viễn thư liên hệ khỏi hệ thống và không thể khôi phục.</p>
            </div>
            <div className="p-4 bg-gray-50 flex gap-3">
              <button onClick={() => setDeleteModal({ isOpen: false, id: 0 })} className="flex-1 bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors">Hủy bỏ</button>
              <button onClick={handleDeleteContact} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-500/30">Vâng, Xóa ngay!</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
