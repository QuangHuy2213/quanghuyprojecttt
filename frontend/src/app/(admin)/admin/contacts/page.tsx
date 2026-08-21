'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

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
    <div className="relative overflow-hidden border-b border-gray-100 last:border-0 group bg-red-500">
      
      {/* 💥 LỚP ẨN BÊN DƯỚI: NÚT XÓA MÀU ĐỎ TƯƠI */}
      <div
        onClick={() => setDeleteModal({ isOpen: true, id: contact.id })}
        className="absolute inset-y-0 right-0 w-[120px] bg-red-500 text-white flex flex-col justify-center items-center cursor-pointer hover:bg-red-600 transition-colors z-0"
      >
        <span className="text-3xl mb-1">🗑️</span>
        <span className="text-sm font-bold">Xóa thư</span>
      </div>

      {/* 📄 LỚP TRÊN: NỘI DUNG BỨC THƯ (CÓ THỂ TRƯỢT QUA LẠI) */}
      <div
        className={`relative z-10 w-full flex flex-col md:flex-row gap-6 p-6 transition-transform duration-300 ease-out md:group-hover:-translate-x-[120px] ${
          contact.status === 'PENDING' ? 'bg-white' : 'bg-gray-50 text-gray-500'
        }`}
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* CỘT 1: THÔNG TIN KHÁCH */}
        <div className="md:w-1/4 flex-shrink-0">
          <div className="font-bold text-gray-800 text-lg">{contact.fullName}</div>
          <div className="text-sm text-gray-500 mt-1 flex items-center gap-2"><span>📧</span> {contact.email}</div>
          <div className="text-xs text-gray-400 mt-2 font-medium">{new Date(contact.createdAt).toLocaleString('vi-VN')}</div>
        </div>

        {/* CỘT 2: NỘI DUNG THƯ */}
        <div className="md:w-2/4 flex-1">
          <div className="text-sm font-bold text-gray-700 bg-gray-100 inline-block px-3 py-1 rounded-lg mb-2">
            Chủ đề: {contact.subject}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-2xl border border-gray-200">
            {contact.message}
          </p>
        </div>

        {/* CỘT 3: TRẠNG THÁI & HÀNH ĐỘNG */}
        <div className="md:w-1/4 flex flex-col justify-between items-end pl-6 md:border-l border-gray-200 flex-shrink-0 pr-4">
          <div className="mb-4">
            {contact.status === 'PENDING' ? (
              <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                Chưa xử lý
              </span>
            ) : (
              <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm">
                <span className="text-green-600 text-sm">✓</span> Đã giải quyết
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full mt-auto">
            {contact.status === 'PENDING' && (
              <>
                <button onClick={() => openEmailModal(contact)} className="w-full bg-blue-50 text-[#1877F2] px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                  ✉️ Gửi Email
                </button>
                <button onClick={() => openConfirmModal(contact.id)} className="w-full bg-[#1877F2] text-white px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2">
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
    fetch(apiUrl('admin/contacts'))
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
      message: `Chào ${contact.fullName},\n\nNhà Tốt đã nhận được yêu cầu của bạn về vấn đề: "${contact.subject}".\n\n[Nhập nội dung phản hồi của bạn vào đây...]\n\nTrân trọng,\nĐội ngũ Admin Nhà Tốt.`
    });
  };

  const handleMarkAsReplied = async () => {
    try {
      const res = await fetch(apiUrl(`admin/contacts/${confirmModal.id}/status`), {
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
      const res = await fetch(apiUrl(`admin/contacts/${deleteModal.id}`), {
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
      const res = await fetch(apiUrl('admin/contacts/reply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailModal),
      });

      if (res.ok) {
        showToast('Gửi Email phản hồi thành công!');
        setContacts(contacts.map(c => c.id === emailModal.contactId ? { ...c, status: 'REPLIED' } : c));
        setEmailModal({ ...emailModal, isOpen: false }); 
      } else {
        showToast('Gửi Email thất bại, vui lòng thử lại.', 'error');
      }
    } catch (error) {
      showToast('Lỗi máy chủ, không thể gửi email!', 'error');
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 font-bold animate-pulse">Đang tải hộp thư liên hệ...</div>;

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

      {/* GIAO DIỆN HỘP THƯ */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            Hộp thư Hỗ trợ <span className="bg-blue-100 text-[#1877F2] px-3 py-1 rounded-full text-sm">{contacts.length}</span>
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {contacts.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-extrabold text-gray-800 text-lg flex items-center gap-2">✉️ Soạn Email Phản Hồi</h3>
              <button onClick={() => setEmailModal({ ...emailModal, isOpen: false })} className="text-gray-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSendEmail} className="p-6 flex-1 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Gửi đến (To)</label>
                  <input type="text" readOnly value={emailModal.email} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Chủ đề (Subject)</label>
                  <input type="text" required value={emailModal.subject} onChange={e => setEmailModal({...emailModal, subject: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none font-bold text-gray-800" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nội dung thư</label>
                  <textarea required rows={8} value={emailModal.message} onChange={e => setEmailModal({...emailModal, message: e.target.value})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#1877F2] outline-none resize-none leading-relaxed text-gray-700" />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button type="button" onClick={() => setEmailModal({ ...emailModal, isOpen: false })} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors">Hủy bỏ</button>
                <button type="submit" disabled={isSending} className="flex-1 bg-[#1877F2] text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70">
                  {isSending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Đang gửi...</> : '✈️ Gửi Email ngay'}
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
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 text-[#1877F2] rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📬</div>
              <h3 className="font-extrabold text-gray-800 text-xl mb-2">Xác nhận xử lý</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Bạn đã phản hồi và muốn đóng yêu cầu hỗ trợ này lại?</p>
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
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🗑️</div>
              <h3 className="font-extrabold text-gray-800 text-xl mb-2">Xóa thư này?</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Hành động này sẽ xóa vĩnh viễn thư liên hệ khỏi hệ thống và không thể khôi phục.</p>
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