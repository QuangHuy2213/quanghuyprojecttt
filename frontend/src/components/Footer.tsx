'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-slate-950 text-white">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-16">
        {/* Main footer */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center">
              <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xl font-black tracking-tighter text-white shadow-lg shadow-blue-500/20">
                NHÀ TỐT
              </div>
            </Link>

            <p className="mt-5 max-w-sm text-sm font-medium leading-7 text-slate-400">
              Nền tảng bất động sản hiện đại, giúp kết nối người mua, người bán
              và môi giới nhanh chóng, minh bạch và thuận tiện hơn.
            </p>

            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-300">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8 9.73a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z"
                  />
                </svg>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  Hotline hỗ trợ
                </div>
                <a
                  href="tel:19006868"
                  className="mt-0.5 block text-lg font-black text-white transition-colors hover:text-blue-300"
                >
                  1900 6868
                </a>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-white">
              Hỗ trợ khách hàng
            </h4>

            <ul className="mt-5 space-y-3.5">
              <li>
                <Link
                  href="#"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-blue-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-400" />
                  Câu hỏi thường gặp
                </Link>
              </li>

              <li>
                <Link
                  href="#"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-blue-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-400" />
                  Hướng dẫn đăng tin
                </Link>
              </li>

              <li>
                <Link
                  href="#"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-blue-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-400" />
                  Quy định đăng tin
                </Link>
              </li>

              <li>
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-blue-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-400" />
                  Liên hệ hỗ trợ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-black uppercase tracking-[0.12em] text-white">
              Về Nhà Tốt
            </h4>

            <ul className="mt-5 space-y-3.5">
              {[
                'Về chúng tôi',
                'Tuyển dụng',
                'Điều khoản dịch vụ',
                'Chính sách bảo mật',
              ].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-blue-300"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-700 transition-colors group-hover:bg-blue-400" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div className="lg:col-span-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
              <h4 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                Kết nối với chúng tôi
              </h4>

              <p className="mt-3 text-sm font-medium leading-6 text-slate-400">
                Theo dõi Nhà Tốt để cập nhật tin bất động sản mới và những thông
                tin hữu ích dành cho người mua, người bán.
              </p>

              <div className="mt-5 flex gap-3">
                <a
                  href="#"
                  aria-label="Facebook"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-slate-300 transition-all hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-blue-600 hover:text-white"
                >
                  FB
                </a>

                <a
                  href="#"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-slate-300 transition-all hover:-translate-y-0.5 hover:border-pink-500/40 hover:bg-pink-600 hover:text-white"
                >
                  IG
                </a>

                <a
                  href="#"
                  aria-label="YouTube"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-slate-300 transition-all hover:-translate-y-0.5 hover:border-red-500/40 hover:bg-red-600 hover:text-white"
                >
                  YT
                </a>
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-blue-400/10 bg-blue-400/5 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                  <svg
                    className="h-4.5 w-4.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 7v5l3 2"
                    />
                  </svg>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500">
                    Thời gian hỗ trợ
                  </div>
                  <div className="mt-0.5 text-sm font-extrabold text-slate-200">
                    08:00 - 22:00 · Thứ 2 - Chủ nhật
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-500">
            © 2026 Nhà Tốt. Tất cả quyền được bảo lưu.
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Hệ thống đang hoạt động
            </span>

            <span className="hidden text-slate-700 sm:inline">•</span>

            <span>Made for modern real estate</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
