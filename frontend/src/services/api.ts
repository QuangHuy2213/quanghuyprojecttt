export const apiUrl = (path: string) => {
  // Ưu tiên dùng biến môi trường, nếu không có mới dùng localhost (chỉ dành cho máy bạn)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  // Xử lý dấu / thừa để tránh lỗi đường dẫn
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${cleanBase}${cleanPath}`;
};