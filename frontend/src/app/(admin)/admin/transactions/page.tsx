'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

// =========================================================================
// 🌟 COMPONENT: MODAL GỬI CẢNH BÁO CHẶN MÀN HÌNH
// =========================================================================
function AdminWarningModal({ targetUserId, targetUserName, onClose }: { targetUserId: string, targetUserName: string, onClose: () => void }) {
  const [isSending, setIsSending] = useState(false);
  const [content, setContent] = useState("Hệ thống phát hiện tài khoản của bạn có dấu hiệu cung cấp thông tin sai lệch nhằm trốn tránh phí nền tảng trong quá trình giao dịch. Yêu cầu bạn nghiêm túc tuân thủ quy định của Nhà Tốt.");

  const handleSendWarning = async () => {
    if (!content.trim()) return alert('Vui lòng nhập nội dung cảnh báo!');
    setIsSending(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl('notifications/admin/send-warning'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId, content: content })
      });

      if (res.ok) {
        alert('Đã phát lệnh cảnh báo đỏ chặn màn hình User thành công!');
        onClose(); 
      } else alert('Gửi thất bại, vui lòng kiểm tra lại!');
    } catch (error) {
      alert('Lỗi kết nối đến máy chủ.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
        <div className="bg-red-500 px-6 py-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><span>🚨</span> Gửi cảnh báo gian lận</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Đối tượng nhận cảnh báo:</label>
            <div className="bg-rose-50 border border-red-100 px-4 py-2.5 rounded-xl text-red-600 font-bold text-sm">
              {targetUserName} (ID: {targetUserId.substring(0, 8)}...)
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nội dung hiển thị chặn màn hình User:</label>
            <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all text-gray-800 font-medium"></textarea>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} disabled={isSending} className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm">Hủy bỏ</button>
            <button onClick={handleSendWarning} disabled={isSending} className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all text-sm disabled:opacity-50">
              {isSending ? 'Đang phát lệnh...' : 'Phát lệnh ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🌟 PAGE CHÍNH: QUẢN LÝ ĐỐI SOÁT (GIAO DỊCH & HÓA ĐƠN)
// =========================================================================
export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'INVOICES'>('TRANSACTIONS');
  
  // States cho Giao Dịch
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState('ALL'); 
  const [warningTarget, setWarningTarget] = useState<{userId: string, userName: string} | null>(null);

  // States cho Hóa Đơn
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invFilter, setInvFilter] = useState('ALL');

  const [loading, setLoading] = useState(true);

  // Lấy Dữ liệu
  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [txRes, invRes] = await Promise.all([
        fetch(apiUrl('admin/transactions'), { headers }),
        fetch(apiUrl('transactions/invoices/admin/all'), { headers }) // 🌟 API gộp chung vào transactions mà ta đã làm
      ]);

      if (txRes.ok) setTransactions(await txRes.json());
      if (invRes.ok) setInvoices(await invRes.json());
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Xử lý Giao dịch ---
  const handleResolveDispute = async (transactionId: string, action: 'APPROVE' | 'CANCEL') => {
    if (!confirm(`Bạn có chắc muốn ${action === 'APPROVE' ? 'PHÊ DUYỆT' : 'HỦY BỎ'} giao dịch này?`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`admin/transactions/${transactionId}/resolve`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (res.ok) { alert('✨ Đã giải quyết tranh chấp!'); fetchData(); }
    } catch (error) { console.error(error); }
  };

  // --- Xử lý Hóa đơn ---
  const handleIssueInvoice = async (invoiceId: string) => {
    if (!confirm('Phát hành hóa đơn và gửi yêu cầu thanh toán cho người dùng?')) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`transactions/invoices/admin/${invoiceId}/issue`), {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { alert('✨ Phát hành hóa đơn thành công!'); fetchData(); }
    } catch (error) { console.error(error); }
  };

  // Lọc dữ liệu
  const filteredTx = transactions.filter(tx => txFilter === 'ALL' || tx.status === txFilter);
  const filteredInv = invoices.filter(inv => invFilter === 'ALL' || inv.status === invFilter);

  const totalRevenue = transactions.filter(tx => tx.status === 'SUCCESS').reduce((sum, tx) => sum + (Number(tx.calculatedFee) || 0), 0);
  const totalCollected = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="text-sm font-bold text-gray-600 tracking-wide">Đang tải dữ liệu đối soát...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden p-6 sm:p-8">
      {warningTarget && <AdminWarningModal targetUserId={warningTarget.userId} targetUserName={warningTarget.userName} onClose={() => setWarningTarget(null)} />}

      {/* HEADER TABS & THỐNG KÊ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-gray-100">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'TRANSACTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Giao Dịch
          </button>
          <button 
            onClick={() => setActiveTab('INVOICES')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'INVOICES' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Hóa Đơn
          </button>
        </div>

        <div className={`text-white px-6 py-3 rounded-2xl shadow-lg flex flex-col ${activeTab === 'TRANSACTIONS' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/20' : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/20'}`}>
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            {activeTab === 'TRANSACTIONS' ? 'Tổng phí App tạm tính' : 'Tổng tiền đã thu (PAID)'}
          </span>
          <span className="text-lg font-black font-mono">
            {activeTab === 'TRANSACTIONS' ? totalRevenue.toLocaleString() : totalCollected.toLocaleString()} VNĐ
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🌟 TAB 1: GIAO DỊCH */}
      {/* ========================================================= */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="animate-fade-in-up mt-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {['ALL', 'SUCCESS', 'VERIFYING', 'DISPUTE', 'FRAUD', 'PENDING_CANCEL', 'CANCELLED_AFTER_SUCCESS'].map((status) => (
              <button key={status} onClick={() => setTxFilter(status)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${txFilter === status ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {status === 'ALL' ? 'Tất cả' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Mã GD / Post</th>
                  <th className="py-3 px-4">Bên Mua & Bên Bán</th>
                  <th className="py-3 px-4">Giá trị nhà</th>
                  <th className="py-3 px-4">Phí App Thu</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredTx.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-xs">Không tìm thấy giao dịch.</td></tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/20 transition-all">
                      <td className="py-4 px-4">
                        <div className="font-bold text-xs text-gray-900 font-mono">#{tx.id.substring(0, 8)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Post ID: {tx.postId}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-700 flex items-center gap-1.5 mb-1">
                          <span className="w-8 text-gray-400">Mua:</span> 
                          <span className="font-bold flex-1">{tx.buyer?.fullName || tx.buyerId?.substring(0, 6)}</span>
                          <button onClick={() => setWarningTarget({userId: tx.buyerId, userName: tx.buyer?.fullName || 'Người Mua'})} className="text-lg hover:scale-110 transition-transform bg-rose-50 rounded px-1" title="Cảnh báo">⚠️</button>
                        </div>
                        <div className="text-xs text-gray-700 flex items-center gap-1.5">
                          <span className="w-8 text-gray-400">Bán:</span> 
                          <span className="font-bold flex-1">{tx.seller?.fullName || tx.sellerId?.substring(0, 6)}</span>
                          <button onClick={() => setWarningTarget({userId: tx.sellerId, userName: tx.seller?.fullName || 'Người Bán'})} className="text-lg hover:scale-110 transition-transform bg-rose-50 rounded px-1" title="Cảnh báo">⚠️</button>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-semibold">{Number(tx.post?.price || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 font-mono text-xs font-bold text-blue-600">{tx.calculatedFee ? `${Number(tx.calculatedFee).toLocaleString()}` : '--'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-black border ${tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : tx.status === 'DISPUTE' ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {tx.status === 'DISPUTE' ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <button onClick={() => handleResolveDispute(tx.id, 'APPROVE')} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold w-full max-w-[120px]">Duyệt Thành Công</button>
                            <button onClick={() => handleResolveDispute(tx.id, 'CANCEL')} className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold w-full max-w-[120px]">Hủy Bỏ</button>
                          </div>
                        ) : <span className="text-xs text-gray-400 italic">N/A</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🌟 TAB 2: HÓA ĐƠN */}
      {/* ========================================================= */}
      {activeTab === 'INVOICES' && (
        <div className="animate-fade-in-up mt-4">
          <div className="flex gap-2 py-2 overflow-x-auto">
            {['ALL', 'DRAFT', 'PENDING_PAYMENT', 'PAID', 'OVERDUE', 'CANCELLED'].map((status) => (
              <button key={status} onClick={() => setInvFilter(status)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${invFilter === status ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {status === 'ALL' ? 'Tất cả' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Mã HĐ / Post</th>
                  <th className="py-3 px-4">Khách Hàng (Người nợ)</th>
                  <th className="py-3 px-4">Số Tiền Thu</th>
                  <th className="py-3 px-4">Hạn Thanh Toán</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredInv.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-xs">Chưa có hóa đơn nào.</td></tr>
                ) : (
                  filteredInv.map((inv) => (
                    <tr key={inv.id} className="hover:bg-emerald-50/20 transition-all">
                      <td className="py-4 px-4">
                        <div className="font-bold text-xs text-gray-900 font-mono">#{inv.id.substring(0, 8)}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">Post ID: {inv.transaction?.postId || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-xs font-bold text-gray-800">{inv.user?.fullName}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{inv.user?.phoneNumber || inv.user?.email}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-bold text-emerald-600">{Number(inv.amount || 0).toLocaleString()}</td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-600">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : '--'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-black border ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : inv.status === 'PENDING_PAYMENT' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        {inv.status === 'DRAFT' ? (
                          <button onClick={() => handleIssueInvoice(inv.id)} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md rounded-xl text-xs font-bold">
                            Phát Hành
                          </button>
                        ) : <span className="text-[11px] text-gray-400 italic">Không khả dụng</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}