'use client';

import React, { useEffect, useState } from 'react';
import { apiUrl } from '@/services/api';

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, SUCCESS, DISPUTE, FRAUD

  // Lấy danh sách giao dịch từ Backend
  const fetchTransactions = () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    
    fetch(apiUrl('admin/transactions'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTransactions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi tải giao dịch:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Hàm để Admin giải quyết tranh chấp (DISPUTE) hoặc can thiệp thủ công
  const handleResolveDispute = async (transactionId: string, action: 'APPROVE' | 'CANCEL') => {
    if (!confirm(`Bạn có chắc chắn muốn ${action === 'APPROVE' ? 'PHỆ DUYỆT (Thành công)' : 'HỦY BỎ'} giao dịch tranh chấp này?`)) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(apiUrl(`admin/transactions/${transactionId}/resolve`), {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        alert('✨ Đã giải quyết tranh chấp thành công!');
        fetchTransactions();
      } else {
        alert('Lỗi khi xử lý giao dịch.');
      }
    } catch (error) {
      console.error("Lỗi:", error);
    }
  };

  // Lọc danh sách theo trạng thái
  const filteredTransactions = transactions.filter(tx => {
    if (filterStatus === 'ALL') return true;
    return tx.status === filterStatus;
  });

  // Tính tổng doanh thu chiết khấu từ các giao dịch SUCCESS
  const totalRevenue = transactions
    .filter(tx => tx.status === 'SUCCESS')
    .reduce((sum, tx) => sum + (Number(tx.calculatedFee) || 0), 0);

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
      
      {/* HEADER & THỐNG KÊ NHANH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Quản lý Đối soát & Doanh thu</h2>
          <p className="text-xs text-gray-500 mt-1">Theo dõi dòng tiền chiết khấu nền tảng và xử lý các ca tranh chấp.</p>
        </div>

        {/* Tổng doanh thu card nhỏ */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20 flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Tổng chiết khấu App thu</span>
          <span className="text-lg font-black font-mono">{totalRevenue.toLocaleString()} VNĐ</span>
        </div>
      </div>

      {/* THANH LỌC TRẠNG THÁI */}
      <div className="flex gap-2 py-4 overflow-x-auto">
        {['ALL', 'SUCCESS', 'VERIFYING', 'DISPUTE', 'FRAUD'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterStatus === status 
                ? 'bg-gray-900 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'ALL' ? 'Tất cả' : status}
          </button>
        ))}
      </div>

      {/* BẢNG DỮ LIỆU GIAO DỊCH */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[11px] uppercase tracking-wider font-bold">
              <th className="py-3 px-4">Mã GD / Bài đăng</th>
              <th className="py-3 px-4">Bên Mua & Bên Bán</th>
              <th className="py-3 px-4">Giá trị nhà</th>
              <th className="py-3 px-4">Phí App Thu</th>
              <th className="py-3 px-4">Trạng thái</th>
              <th className="py-3 px-4 text-right">Hành động Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-xs">Không tìm thấy dữ liệu đối soát phù hợp.</td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-blue-50/20 transition-all">
                  
                  {/* Mã GD */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-xs text-gray-900 font-mono">#{tx.id.substring(0, 8)}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Bài đăng ID: {tx.postId}</div>
                  </td>

                  {/* Thành viên */}
                  <td className="py-4 px-4">
                    <div className="text-xs text-gray-700">Mua: <span className="font-bold">{tx.buyerId?.substring(0, 6)}...</span></div>
                    <div className="text-xs text-gray-700 mt-0.5">Bán: <span className="font-bold">{tx.sellerId?.substring(0, 6)}...</span></div>
                  </td>

                  {/* Giá trị */}
                  <td className="py-4 px-4 font-mono text-xs font-semibold text-gray-800">
                    {Number(tx.post?.price || 0).toLocaleString()} VNĐ
                  </td>

                  {/* Phí thu */}
                  <td className="py-4 px-4 font-mono text-xs font-bold text-blue-600">
                    {tx.calculatedFee ? `${Number(tx.calculatedFee).toLocaleString()} VNĐ` : 'Chưa tính'}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wide border ${
                      tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      tx.status === 'DISPUTE' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                      tx.status === 'FRAUD' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {tx.status}
                    </span>
                  </td>

                  {/* Hành động (Đặc biệt xử lý khi trạng thái là DISPUTE - Tranh chấp) */}
                  <td className="py-4 px-4 text-right space-x-2">
                    {tx.status === 'DISPUTE' ? (
                      <>
                        <button 
                          onClick={() => handleResolveDispute(tx.id, 'APPROVE')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
                        >
                          Duyệt Thành Công
                        </button>
                        <button 
                          onClick={() => handleResolveDispute(tx.id, 'CANCEL')}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                        >
                          Hủy Bỏ
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Đã hoàn tất</span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}