'use client';

import React, { useState } from 'react';
import Header from '../../components/Header';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    // Xử lý gửi form API ở đây (nếu có backend)
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="max-w-4xl mx-auto py-12 px-4 flex-grow w-full">
        <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-100">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-800">Liên hệ & Hỗ trợ</h1>
            <p className="text-gray-500 mt-2 text-sm">Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn 24/7</p>
          </div>

          {/* Các khối thông tin liên hệ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-blue-50/60 p-6 rounded-2xl text-center border border-blue-100">
              <span className="text-3xl mb-3 block">📞</span>
              <h3 className="font-bold text-gray-800 mb-1">Hotline</h3>
              <p className="text-[#1877F2] font-extrabold text-lg">1900 6868</p>
              <span className="text-xs text-gray-400">8:00 - 21:00 hàng ngày</span>
            </div>
            <div className="bg-blue-50/60 p-6 rounded-2xl text-center border border-blue-100">
              <span className="text-3xl mb-3 block">📧</span>
              <h3 className="font-bold text-gray-800 mb-1">Email hỗ trợ</h3>
              <p className="text-[#1877F2] font-bold text-sm">hotro@nhatot.vn</p>
              <span className="text-xs text-gray-400">Phản hồi trong 24h</span>
            </div>
            <div className="bg-blue-50/60 p-6 rounded-2xl text-center border border-blue-100">
              <span className="text-3xl mb-3 block">🏢</span>
              <h3 className="font-bold text-gray-800 mb-1">Trụ sở chính</h3>
              <p className="text-gray-600 text-xs mt-1">Đại lộ Bình Dương, Phường Hiệp Thành, TP. Thủ Dầu Một</p>
            </div>
          </div>

          {/* Form gửi yêu cầu */}
          <div className="border-t border-gray-100 pt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Gửi tin nhắn cho chúng tôi</h2>
            
            {isSubmitted ? (
              <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-2xl text-center font-bold">
                🎉 Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Họ và tên *</label>
                    <input required type="text" placeholder="Nhập họ tên của bạn..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Số điện thoại *</label>
                    <input required type="tel" placeholder="Nhập số điện thoại..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nội dung yêu cầu *</label>
                  <textarea required rows={4} placeholder="Nhập nội dung cần hỗ trợ..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-[#1877F2] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all text-sm">
                  Gửi yêu cầu hỗ trợ
                </button>
              </form>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}