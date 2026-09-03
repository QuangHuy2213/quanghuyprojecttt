const LOCAL_API = 'http://127.0.0.1:8000/api';

export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Khi chạy local, frontend đi qua FastAPI Security Tool
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return `${LOCAL_API}${cleanPath}`;
  }

  // Khi deploy Vercel, dùng Security Tool trên Render
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://quanghuy-security.onrender.com/api';

  const cleanBase = baseUrl.replace(/\/+$/, '');

  return `${cleanBase}${cleanPath}`;
};