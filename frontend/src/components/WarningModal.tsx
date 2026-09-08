'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useInbox } from './InboxProvider';
import { apiFetch } from '@/services/api';

export default function WarningModal() {
  const { notifications: allNotifications, setNotifications } = useInbox();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const warningPopup = allNotifications.filter(item => item.type === 'WARNING_POPUP' && !item.isRead && !item.is_read).sort((a, b) => a.id - b.id)[0];
  const handleAcknowledgeWarning = async () => {
    if (!warningPopup || busy) return;
    setBusy(true); setError('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await apiFetch(`notifications/${warningPopup.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotifications(current => current.map(item => item.id === warningPopup.id ? { ...item, isRead: true, is_read: true } : item));
    } catch (err) {
      setError('Chưa thể xác nhận. Vui lòng thử lại.');
      console.error('Lỗi khi xác nhận cảnh báo', err);
    } finally { setBusy(false); }
  };

  if (!warningPopup || typeof document === 'undefined') return null;
  return createPortal((
      
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-5" role="dialog" aria-modal="true" aria-label="Admin warning">
          <div className="w-full max-w-lg max-h-[calc(100dvh-40px)] overflow-y-auto overscroll-contain rounded-[30px] border border-rose-100 bg-white shadow-[0_30px_100px_-25px_rgba(244,63,94,0.5)] animate-fade-in-up">
            <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-br from-rose-600 to-red-700 p-8 text-center">
              {/* Hiệu ứng nền chớp đỏ */}
              <div className="absolute inset-0 bg-red-600 animate-pulse opacity-50"></div>
              <span className="text-6xl mb-3 relative z-10 drop-shadow-md">🚨</span>
              <h2 className="text-xl font-black text-white uppercase tracking-wider relative z-10 drop-shadow-md">
                {warningPopup.title || 'CẢNH BÁO TỪ BAN QUẢN TRỊ'}
              </h2>
            </div>

            <div className="p-8 text-center bg-white">
              <p className="text-gray-800 font-medium text-[15px] leading-relaxed mb-6 whitespace-pre-wrap break-words">
                {warningPopup.content}
              </p>

              <div className="bg-rose-50 border border-red-100 rounded-2xl p-5 mb-8 text-left shadow-inner">
                <p className="text-xs text-red-700 font-medium leading-relaxed">
                  <b>* Lưu ý nghiêm trọng:</b> Mọi hành vi cố tình cung cấp thông tin sai
                  lệch, lách luật hoặc trốn tránh phí nền tảng trong quá trình giao dịch
                  sẽ dẫn đến việc tài khoản của bạn bị <b>khóa vĩnh viễn</b> và đưa vào
                  danh sách đen của Nhà Tốt.
                </p>
              </div>

              {error && <p role="alert" className="mb-3 text-red-600">{error}</p>}
              <button
                disabled={busy}
                onClick={handleAcknowledgeWarning}
                className="w-full rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase
                  tracking-wide text-white shadow-xl transition-all hover:bg-black
                  active:scale-[0.98]"
              >
                Tôi đã hiểu và cam kết tuân thủ
              </button>
            </div>
          </div>
        </div>
      
  ), document.body);
}
