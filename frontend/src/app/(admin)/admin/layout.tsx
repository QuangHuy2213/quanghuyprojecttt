'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import UserAvatar from '@/components/UserAvatar';

type AuthState = 'checking' | 'authorized' | 'denied';

const menuItems = [
  {
    name: 'Tổng quan',
    subtitle: 'Dashboard hệ thống',
    path: '/admin',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    ),
  },
  {
    name: 'Quản lý Đối soát',
    subtitle: 'Giao dịch & hóa đơn',
    path: '/admin/transactions',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" d="M3 10h18M7 15h3" />
      </svg>
    ),
  },
  {
    name: 'Quản lý Người dùng',
    subtitle: 'Tài khoản & phân quyền',
    path: '/admin/users',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    name: 'Duyệt bài đăng',
    subtitle: 'Kiểm duyệt nội dung',
    path: '/admin/posts',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M8 13h8M8 17h5" />
      </svg>
    ),
  },
  {
    name: 'Báo cáo vi phạm',
    subtitle: 'Theo dõi & xử lý',
    path: '/admin/reports',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V5a2 2 0 012-2h6l1 2h7l-3 5 3 5h-7l-1-2H6a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    name: 'Liên hệ & Trợ giúp',
    subtitle: 'Hộp thư hỗ trợ',
    path: '/admin/contacts',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authState, setAuthState] = useState<AuthState>('checking');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [logoutModal, setLogoutModal] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');

    if (!userStr || !token) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(userStr);

      if (user.role !== 'ADMIN') {
        setAuthState('denied');

        const timer = window.setTimeout(() => {
          router.replace('/');
        }, 1600);

        return () => window.clearTimeout(timer);
      }

      setAdminUser(user);
      setAuthState('authorized');
    } catch {
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    setLogoutModal(false);
    router.push('/login');
  };

  if (authState === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-4">
        <div className="relative w-full max-w-sm overflow-hidden rounded-[30px] border border-slate-200 bg-white p-9 text-center shadow-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>

          <h2 className="mt-5 text-lg font-black text-slate-900">
            Đang xác thực hệ thống
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Đang kiểm tra phiên đăng nhập và quyền quản trị của bạn...
          </p>
        </div>
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950/95 px-4 backdrop-blur">
        <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_30px_100px_-25px_rgba(244,63,94,0.45)]">
          <div className="bg-gradient-to-br from-rose-600 to-red-700 p-7 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl">
              !
            </div>
            <h2 className="mt-4 text-xl font-black">
              Không có quyền truy cập
            </h2>
          </div>

          <div className="p-7 text-center">
            <p className="text-sm font-medium leading-6 text-slate-600">
              Tài khoản hiện tại không có quyền truy cập khu vực quản trị.
              Hệ thống sẽ đưa bạn trở lại trang chủ.
            </p>

            <button
              onClick={() => router.replace('/')}
              className="mt-6 w-full rounded-2xl bg-slate-950 py-3.5 text-sm font-black text-white transition-all hover:bg-black"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeItem =
    menuItems.find((item) => isActivePath(pathname, item.path)) ||
    menuItems[0];

  return (
    <div className="flex min-h-screen bg-slate-100/80 font-sans text-slate-800">
      {/* SIDEBAR */}
      <aside className="sticky top-0 z-30 flex h-screen w-72 flex-shrink-0 flex-col border-r border-slate-700/60 bg-gradient-to-b from-[#0f172a] via-[#111827] to-[#0b1220] text-white shadow-[12px_0_40px_-20px_rgba(15,23,42,0.38)]">
        <div className="border-b border-slate-700/60 px-6 py-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xl font-black tracking-tighter text-white shadow-lg shadow-blue-500/20">
              NHÀ TỐT
            </div>
          </Link>

          <div className="mt-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Admin Console
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto px-4 py-5">
          <div className="mb-3 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
            Quản trị hệ thống
          </div>

          {menuItems.map((item) => {
            const isActive = isActivePath(pathname, item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`group flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 transition-all ${
                  isActive
                    ? 'border-blue-400/30 bg-blue-500/15 text-white shadow-[0_8px_24px_-16px_rgba(59,130,246,0.55)]'
                    : 'border-slate-700/60 bg-slate-800/45 text-slate-300 hover:border-slate-600/80 hover:bg-slate-800/75 hover:text-white'
                }`}
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-700/65 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                  }`}
                >
                  {item.icon}
                </div>

                <div className="min-w-0">
                  <div
                    className={`truncate text-sm font-extrabold ${
                      isActive ? 'text-white' : ''
                    }`}
                  >
                    {item.name}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-xs font-medium ${
                      isActive ? 'text-blue-200/90' : 'text-slate-400'
                    }`}
                  >
                    {item.subtitle}
                  </div>
                </div>

                {isActive && (
                  <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ADMIN INFO */}
        <div className="border-t border-slate-700/60 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-3 shadow-sm">
            <UserAvatar
              user={adminUser}
              className="h-10 w-10 rounded-xl border border-slate-600"
            />

            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-white">
                {adminUser?.fullName || 'Quản trị viên'}
              </div>
              <div className="mt-0.5 text-xs font-bold text-sky-300">
                Administrator
              </div>
            </div>
          </div>

          <button
            onClick={() => setLogoutModal(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-extrabold text-rose-300 transition-all hover:border-rose-400/30 hover:bg-rose-500/15 hover:text-rose-200"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
              />
            </svg>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        {/* ADMIN HEADER */}
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 px-6 py-4 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-blue-600">
                <span>Admin</span>
                <span className="text-slate-300">/</span>
                <span className="truncate text-slate-400">
                  {activeItem.subtitle}
                </span>
              </div>

              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-slate-950">
                {activeItem.name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-700 sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Hệ thống hoạt động
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pr-3 shadow-sm">
                <UserAvatar
                  user={adminUser}
                  className="h-10 w-10 rounded-xl"
                />

                <div className="hidden text-right md:block">
                  <div className="max-w-[180px] truncate text-sm font-black text-slate-900">
                    {adminUser?.fullName}
                  </div>
                  <div className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-blue-600">
                    Quản trị viên
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 p-5 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* LOGOUT POPUP */}
      {logoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-[0_30px_100px_-25px_rgba(15,23,42,0.6)]">
            <div className="p-7 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-600">
                <svg
                  className="h-7 w-7"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
                  />
                </svg>
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-900">
                Đăng xuất khỏi Admin?
              </h3>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                Phiên đăng nhập hiện tại sẽ kết thúc và bạn cần đăng nhập lại
                để truy cập khu vực quản trị.
              </p>
            </div>

            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 p-4">
              <button
                onClick={() => setLogoutModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-slate-700 transition-all hover:bg-slate-100"
              >
                Ở lại
              </button>

              <button
                onClick={handleLogout}
                className="flex-1 rounded-2xl bg-rose-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isActivePath(currentPath: string, menuPath: string) {
  if (menuPath === '/admin') return currentPath === '/admin';
  return currentPath.startsWith(menuPath);
}
