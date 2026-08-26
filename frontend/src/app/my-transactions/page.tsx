'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { apiUrl } from '@/services/api';

export default function UserTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // State cho Modal Yêu Cầu Hủy Kèo
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean, txId: string }>({ isOpen: false, txId: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    
    if (userStr && token) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      
      // Fetch lịch sử giao dịch cá nhân
      fetch(apiUrl('transactions/my-transactions'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch(err => console.error("Lỗi tải giao dịch:", err));
    }
  }, []);

  // 1. Hàm Gửi yêu cầu hủy
  const submitCancelRequest = async () => {
    if (!cancelReason.trim()) return alert('Vui lòng nhập lý do hủy!');
    setIsCancelling(true);
    
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`transactions/${cancelModal.txId}/request-cancel`), {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (res.ok) {
        alert('Đã gửi yêu cầu hủy. Đang chờ đối tác xác nhận.');
        setCancelModal({ isOpen: false, txId: '' });
        setCancelReason('');
        window.location.reload(); 
      } else {
        const errorData = await res.json();
        alert(`Không thể gửi yêu cầu: ${errorData.message}`);
      }
    } catch (error) {
      alert('Lỗi kết nối.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 2. Hàm Phản hồi yêu cầu hủy (Đồng ý / Kháng cáo)
  const handleRespondCancel = async (txId: string, isAgreed: boolean) => {
    const actionText = isAgreed ? "ĐỒNG Ý HỦY" : "PHẢN ĐỐI (Đưa ra Tranh chấp)";
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} giao dịch này?`)) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`transactions/${txId}/respond-cancel`), {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ isAgreed })
      });

      if (res.ok) {
        alert(isAgreed ? 'Đã xác nhận hủy giao dịch thành công.' : 'Đã chuyển giao dịch sang trạng thái Tranh chấp. Ban quản trị sẽ kiểm tra.');
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert(`Lỗi: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Lỗi phản hồi:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Lịch sử giao dịch</h1>
        
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Bạn chưa có giao dịch nào.</div>
          ) : (
            <div className="space-y-4">
              {transactions.map(tx => {
                const isBuyer = tx.buyerId === currentUser?.id;
                const roleText = isBuyer ? 'Bạn là người mua' : 'Bạn là người bán';
                const isInitiator = tx.cancelInitiatorId === currentUser?.id;
                
                // Kiểm tra xem đã qua 3 ngày (Grace Period) chưa
                const updatedAt = new Date(tx.updatedAt);
                const isGracePeriodOver = (new Date().getTime() - updatedAt.getTime()) > (3 * 24 * 60 * 60 * 1000);

                return (
                  <div key={tx.id} className="border border-gray-100 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-100 transition-all">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">#{tx.id.substring(0,8)}</span>
                        <span className="text-xs font-semibold text-blue-600">{roleText}</span>
                      </div>
                      <h3 className="font-bold text-gray-800">Giao dịch Bài đăng ID: {tx.postId}</h3>
                      <p className="text-sm mt-1">
                        Trạng thái: <strong className={
                          tx.status === 'SUCCESS' ? 'text-emerald-600' : 
                          tx.status === 'PENDING_CANCEL' ? 'text-amber-500' :
                          tx.status === 'DISPUTE' ? 'text-rose-600' : 'text-gray-700'
                        }>{tx.status}</strong>
                      </p>

                      {/* Hiển thị lý do nếu đang chờ hủy */}
                      {tx.status === 'PENDING_CANCEL' && (
                        <p className="text-xs text-gray-500 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                          Lý do xin hủy: "{tx.cancelReason}"
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* TRƯỜNG HỢP 1: Giao dịch thành công -> Bấm xin hủy */}
                      {tx.status === 'SUCCESS' && !isGracePeriodOver && (
                        <button 
                          onClick={() => setCancelModal({ isOpen: true, txId: tx.id })}
                          className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold rounded-xl text-sm transition-all"
                        >
                          Yêu cầu Hủy kèo
                        </button>
                      )}
                      
                      {tx.status === 'SUCCESS' && isGracePeriodOver && (
                        <span className="text-xs italic text-gray-400">Đã quá hạn hủy</span>
                      )}
                      
                      {/* TRƯỜNG HỢP 2: Đang chờ hủy */}
                      {tx.status === 'PENDING_CANCEL' && (
                        isInitiator ? (
                          <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl">Đang chờ đối tác duyệt</span>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleRespondCancel(tx.id, true)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl text-sm transition-all"
                            >
                              Đồng ý Hủy
                            </button>
                            <button 
                              onClick={() => handleRespondCancel(tx.id, false)}
                              className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 shadow-md font-bold rounded-xl text-sm transition-all"
                            >
                              Phản đối (Đưa ra Admin)
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 🌟 MODAL NHẬP LÝ DO YÊU CẦU HỦY */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in-up">
            <h3 className="font-black text-lg text-gray-900 mb-2">Yêu cầu Hủy Giao Dịch</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vui lòng nhập lý do. Đối tác của bạn sẽ xem xét và xác nhận yêu cầu này.
            </p>
            
            <textarea 
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ví dụ: Xem nhà thực tế không ưng ý, thỏa thuận lại không thành công..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm min-h-[100px] mb-4 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setCancelModal({ isOpen: false, txId: '' })}
                className="px-4 py-2 bg-gray-100 font-bold text-gray-700 rounded-xl hover:bg-gray-200"
              >
                Đóng
              </button>
              <button 
                onClick={submitCancelRequest}
                disabled={isCancelling}
                className="px-4 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {isCancelling ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}