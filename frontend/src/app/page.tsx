'use client';

import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import PostList from '../components/PostList';
import Footer from '../components/Footer';
import { apiUrl } from '../services/api';

type HomeToast = {
  show: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

const heroMiniImages = [
  {
    src: 'https://da28rauy2a860.cloudfront.net/completehome/wp-content/uploads/2021/03/03114534/Millbrook-Homes-58series-1.jpg',
    label: 'Nhà phố hiện đại',
    className: 'left-[4%] top-[24%] -rotate-6',
  },
  {
    src: 'https://www.sahomeowner.co.za/wp-content/uploads/2015/03/steyncity-9253-2.jpg',
    label: 'Không gian cao cấp',
    className: 'right-[4%] top-[18%] rotate-6',
  },
  {
    src: 'https://images.squarespace-cdn.com/content/5ff66b9e67a5a02a5d51f8bc/a28a5105-e350-470b-ada0-a424eccb27fc/001.jpg?content-type=image%2Fjpeg',
    label: 'Villa sân vườn',
    className: 'left-[10%] bottom-[10%] rotate-3',
  },
  {
    src: 'https://media-production.lp-cdn.com/cdn-cgi/image/format%3Dauto%2Cquality%3D85%2Cfit%3Dscale-down%2Cwidth%3D1280/https%3A/media-production.lp-cdn.com/media/f9f2e2d5-1859-4e62-8cf2-6f492f741143',
    label: 'Tổ ấm lý tưởng',
    className: 'right-[9%] bottom-[8%] -rotate-3',
  },
];

export default function HomePage() {
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    keyword: '',
    city: '',
    district: '',
    price: '',
    area: '',
    transactionType: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [toast, setToast] = useState<HomeToast>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    fetch(apiUrl('cities'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCities(data);
      })
      .catch((err) => console.error('Lỗi tải tỉnh thành:', err));
  }, []);

  useEffect(() => {
    if (filters.city) {
      fetch(apiUrl(`districts/${filters.city}`))
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setDistricts(data);
        })
        .catch((err) => console.error('Lỗi tải quận huyện:', err));
    } else {
      setDistricts([]);
      setFilters((prev) => ({ ...prev, district: '' }));
    }
  }, [filters.city]);

  const showToast = (
    type: 'success' | 'error' | 'info',
    title: string,
    message: string
  ) => {
    setToast({ show: true, type, title, message });

    window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
  };

  const handleReset = () => {
    const empty = {
      keyword: '',
      city: '',
      district: '',
      price: '',
      area: '',
      transactionType: '',
    };

    setFilters(empty);
    setAppliedFilters(empty);

    showToast(
      'info',
      'Đã làm mới bộ lọc',
      'Tất cả tiêu chí tìm kiếm đã được đưa về mặc định.'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters(filters);

    showToast(
      'success',
      'Đã áp dụng bộ lọc',
      'Danh sách bất động sản đang được cập nhật theo tiêu chí của bạn.'
    );
  };

  const handleSaveSearch = () => {
    if (!filters.keyword && !filters.city) {
      showToast(
        'error',
        'Chưa đủ thông tin',
        'Vui lòng nhập từ khóa hoặc chọn khu vực cần tìm kiếm trước khi lưu.'
      );
      return;
    }

    const saved = JSON.parse(
      localStorage.getItem('saved_searches') || '[]'
    );

    const exists = saved.some(
      (s: any) =>
        s.keyword === filters.keyword &&
        s.city === filters.city &&
        s.district === filters.district
    );

    if (exists) {
      showToast(
        'info',
        'Tìm kiếm đã được lưu',
        'Bộ lọc này đã có trong danh sách tìm kiếm đã lưu của bạn.'
      );
      return;
    }

    const updated = [filters, ...saved];
    localStorage.setItem('saved_searches', JSON.stringify(updated));

    showToast(
      'success',
      'Lưu tìm kiếm thành công',
      'Bạn có thể xem lại bộ lọc này tại mục Tiện ích.'
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100/70 text-slate-900">
      <Header />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes homeFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-10px); }
            }
            @keyframes homeFloatSlow {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(8px); }
            }
            .home-float { animation: homeFloat 5s ease-in-out infinite; }
            .home-float-slow { animation: homeFloatSlow 6.5s ease-in-out infinite; }
          `,
        }}
      />

      {/* POPUP THÔNG BÁO */}
      <div
        className={`fixed left-1/2 top-24 z-[100] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 transition-all duration-300 ${
          toast.show
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0'
        }`}
      >
        <div
          className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xl ${
            toast.type === 'error'
              ? 'border-rose-200'
              : toast.type === 'info'
              ? 'border-blue-200'
              : 'border-emerald-200'
          }`}
        >
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-lg font-black ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-600'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {toast.type === 'error' ? '!' : toast.type === 'info' ? 'i' : '✓'}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-black text-slate-900">
              {toast.title}
            </div>
            <div className="mt-1 text-sm font-medium leading-6 text-slate-600">
              {toast.message}
            </div>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-slate-950 pb-36 pt-16 text-white sm:pb-40 sm:pt-20 lg:min-h-[510px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.2),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-blue-950/35 to-transparent" />

        {/* MINI IMAGE CARDS */}
        <div className="pointer-events-none absolute inset-0 hidden xl:block">
          {heroMiniImages.map((image, index) => (
            <div
              key={image.label}
              className={`absolute ${image.className} ${
                index % 2 === 0 ? 'home-float' : 'home-float-slow'
              }`}
            >
              <div className="w-[170px] overflow-hidden rounded-[24px] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-md">
                <img
                  src={image.src}
                  alt={image.label}
                  className="h-[112px] w-full rounded-[18px] object-cover"
                />
                <div className="flex items-center justify-between px-2 pb-1 pt-2">
                  <span className="text-xs font-extrabold text-white">
                    {image.label}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-xs">
                    ↗
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative mini cards for tablet */}
        <div className="pointer-events-none absolute left-6 top-14 hidden h-24 w-20 -rotate-6 overflow-hidden rounded-2xl border border-white/20 shadow-xl md:block xl:hidden">
          <img
            src={heroMiniImages[0].src}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="pointer-events-none absolute right-6 top-20 hidden h-24 w-20 rotate-6 overflow-hidden rounded-2xl border border-white/20 shadow-xl md:block xl:hidden">
          <img
            src={heroMiniImages[1].src}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-extrabold tracking-wide text-blue-100 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />
            Nền tảng Bất động sản & Môi giới
          </div>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Tìm đúng bất động sản.
            <span className="mt-1 block bg-gradient-to-r from-blue-300 via-sky-300 to-cyan-200 bg-clip-text text-transparent">
              Chạm gần hơn tới tổ ấm.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[15px] font-medium leading-7 text-slate-300 sm:text-base">
            Khám phá hàng ngàn tin mua bán và cho thuê được cập nhật mỗi ngày,
            với bộ lọc trực quan giúp bạn tìm đúng khu vực, mức giá và diện tích
            mong muốn.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-slate-200 backdrop-blur">
              ✓ Tìm kiếm nhanh
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-slate-200 backdrop-blur">
              ✓ Tin đăng đa dạng
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-slate-200 backdrop-blur">
              ✓ Kết nối trực tiếp
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH PANEL */}
      <div className="relative z-30 mx-auto -mt-24 mb-8 w-full max-w-6xl px-4">
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.45)]"
        >
          <div className="search-panel-header border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-blue-50/60 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-lg font-black tracking-tight text-slate-900">
                  Bạn đang tìm loại bất động sản nào?
                </div>
                <div className="mt-1 text-sm font-medium text-slate-500">
                  Chọn nhu cầu và thiết lập bộ lọc phù hợp.
                </div>
              </div>

              <div className="inline-flex rounded-2xl bg-slate-100 p-1.5">
                {[
                  ['', 'Tất cả'],
                  ['SALE', 'Mua bán'],
                  ['RENT', 'Cho thuê'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const next = {
                        ...filters,
                        transactionType: value,
                      };
                      setFilters(next);
                      setAppliedFilters(next);
                    }}
                    className={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition-all ${
                      filters.transactionType === value
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>

              <input
                value={filters.keyword}
                onChange={(e) =>
                  setFilters({ ...filters, keyword: e.target.value })
                }
                placeholder="Tên dự án, đường, khu vực bạn muốn tìm..."
                className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-[15px] font-semibold text-slate-800 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={filters.city}
                onChange={(e) =>
                  setFilters({ ...filters, city: e.target.value })
                }
                className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Tỉnh / Thành phố</option>
                {cities.map((city) => (
                  <option key={city.code} value={city.code}>
                    {city.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.district}
                onChange={(e) =>
                  setFilters({ ...filters, district: e.target.value })
                }
                disabled={!filters.city}
                className={`h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm font-bold outline-none transition-all ${
                  !filters.city
                    ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'cursor-pointer bg-slate-50 text-slate-700 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
                }`}
              >
                <option value="">Quận / Huyện</option>
                {districts.map((district) => (
                  <option key={district.code} value={district.code}>
                    {district.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.price}
                onChange={(e) =>
                  setFilters({ ...filters, price: e.target.value })
                }
                className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Mức giá</option>
                <option value="under-1b">Dưới 1 tỷ</option>
                <option value="1b-3b">1 - 3 tỷ</option>
                <option value="3b-5b">3 - 5 tỷ</option>
                <option value="over-5b">Trên 5 tỷ</option>
              </select>

              <select
                value={filters.area}
                onChange={(e) =>
                  setFilters({ ...filters, area: e.target.value })
                }
                className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">Diện tích</option>
                <option value="under-30">Dưới 30 m²</option>
                <option value="30-50">30 - 50 m²</option>
                <option value="50-80">50 - 80 m²</option>
                <option value="over-80">Trên 80 m²</option>
              </select>
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-slate-500">
                Mẹo: nhập tên đường hoặc dự án để thu hẹp kết quả nhanh hơn.
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 transition-all hover:bg-slate-50"
                >
                  Làm mới
                </button>

                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="search-save-button rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700 transition-all hover:bg-blue-100"
                >
                  Lưu tìm kiếm
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
                >
                  Tìm bất động sản
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* QUICK BENEFITS */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: '⌂',
              title: 'Nguồn tin đa dạng',
              desc: 'Mua bán và cho thuê trên nhiều khu vực.',
            },
            {
              icon: '⌕',
              title: 'Bộ lọc trực quan',
              desc: 'Thu hẹp kết quả theo nhu cầu chỉ trong vài giây.',
            },
            {
              icon: '↗',
              title: 'Kết nối nhanh',
              desc: 'Xem chi tiết và liên hệ trực tiếp người đăng.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-black text-blue-700">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-black text-slate-900">
                  {item.title}
                </div>
                <div className="mt-1 text-sm font-medium leading-5 text-slate-500">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POST LIST */}
      <main className="mx-auto w-full max-w-6xl flex-grow px-4 pb-14 pt-9">
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Khám phá bất động sản
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Tin bất động sản mới đăng
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Những lựa chọn mới đang chờ bạn khám phá.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Danh sách được cập nhật từ hệ thống
          </div>
        </div>

        <PostList filters={appliedFilters} />
      </main>

      <Footer />
    </div>
  );
}
