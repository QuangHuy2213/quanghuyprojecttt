const LOCAL_API = 'http://127.0.0.1:8000/api';

export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/')
    ? path
    : `/${path}`;

  if (
    typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ) {
    return `${LOCAL_API}${cleanPath}`;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://quanghuy-security.onrender.com/api';

  const cleanBase = baseUrl.replace(/\/+$/, '');

  return `${cleanBase}${cleanPath}`;
};


/**
 * Lấy Client ID cố định cho trình duyệt.
 * Client ID này không phải token đăng nhập.
 */
export const getClientId = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const storageKey = 'security_client_id';

  let clientId = localStorage.getItem(
    storageKey
  );

  if (!clientId) {
    clientId = crypto.randomUUID();

    localStorage.setItem(
      storageKey,
      clientId
    );
  }

  return clientId;
};


/**
 * Hàm fetch dùng chung cho toàn bộ frontend.
 * Tự động thêm X-Client-Id.
 */
export const apiFetch = async (
  path: string,
  options: RequestInit = {}
) => {
  const clientId = getClientId();

  const headers = new Headers(
    options.headers || {}
  );

  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  if (
    options.body &&
    !isFormData &&
    !headers.has('Content-Type')
  ) {
    headers.set(
      'Content-Type',
      'application/json'
    );
  }

  if (clientId) {
    headers.set(
      'X-Client-Id',
      clientId
    );
  }

  return fetch(
    apiUrl(path),
    {
      ...options,
      headers,
    }
  );
};
