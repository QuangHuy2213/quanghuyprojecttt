'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Cột 1: Thông tin thương hiệu */}
        <div className="space-y-4">
          <div className="bg-white text-[#1877F2] font-extrabold text-2xl px-3 py-1 rounded-full tracking-tighter shadow-sm inline-block">
            NHÀ TỐT
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Nền tảng bất động sản uy tín hàng đầu. Kết nối người mua và người bán một cách nhanh chóng và an toàn nhất.
          </p>
        </div>

        {/* Cột 2: Hỗ trợ khách hàng */}
        <div>
          <h4 className="font-bold text-lg mb-4 text-white">Hỗ trợ khách hàng</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Câu hỏi thường gặp</Link></li>
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Hướng dẫn đăng tin</Link></li>
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Quy định đăng tin</Link></li>
            {/* Đã liên kết trực tiếp đến trang /contact */}
            <li><Link href="/contact" className="hover:text-blue-400 transition-colors">Liên hệ hỗ trợ</Link></li>
          </ul>
        </div>

        {/* Cột 3: Về công ty */}
        <div>
          <h4 className="font-bold text-lg mb-4 text-white">Về Nhà Tốt</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Về chúng tôi</Link></li>
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Tuyển dụng</Link></li>
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Điều khoản dịch vụ</Link></li>
            <li><Link href="#" className="hover:text-blue-400 transition-colors">Chính sách bảo mật</Link></li>
          </ul>
        </div>

        {/* Cột 4: Kết nối */}
        <div>
          <h4 className="font-bold text-lg mb-4 text-white">Kết nối với chúng tôi</h4>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-blue-600 transition-all">FB</a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-600 transition-all">IG</a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-red-600 transition-all">YT</a>
          </div>
          <div className="mt-6 text-sm text-gray-500">
            Hotline: 1900 6868
          </div>
        </div>
      </div>

      {/* Dòng copyright */}
      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-600">
        © 2026 Nhà Tốt. Tất cả quyền được bảo lưu.
      </div>
    </footer>
  );
}