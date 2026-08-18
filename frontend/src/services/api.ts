const LOCAL_API = 'http://localhost:3001';

export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Khi dev trên máy (localhost:3000), luôn gọi backend local port 3001
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `${LOCAL_API}${cleanPath}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || LOCAL_API;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}${cleanPath}`;
};