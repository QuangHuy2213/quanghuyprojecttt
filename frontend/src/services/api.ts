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
const inFlight = new Map<string, {
  controller: AbortController;
  promise: Promise<Response>;
  consumers: number;
}>();
const responseCache = new Map<string, { response: Response; expires: number }>();
const cooldowns = new Map<string, number>();
let cacheVersion = 0;

const rateLimitGroup = (path: string, method = 'GET') => {
  const normalized = `/${path.toLowerCase().replace(/^\/+/, '').split('?')[0]}`;
  if (['/payment', '/checkout'].some(part => normalized.includes(part))) return 'payment';
  if (['/upload', '/media', '/files'].some(part => normalized.includes(part))) return 'upload';
  if (method === 'GET') return 'read';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'write';
  return 'default';
};

const cooldownKey = (group: string) => `api_retry_until:${apiUrl('')}:${group}`;

export const getApiRetryDelay = (path: string, method = 'GET') => {
  const key = cooldownKey(rateLimitGroup(path, method.toUpperCase()));
  let until = cooldowns.get(key) || 0;
  try {
    until = Math.max(until, Number(localStorage.getItem(key)) || 0);
  } catch { /* Memory cooldown still works when storage is unavailable. */ }
  return Math.max(0, until - Date.now());
};

export const clearApiCache = () => {
  cacheVersion += 1;
  responseCache.clear();
};

const limitedResponse = (delay: number, group: string) => {
  const seconds = Math.ceil(delay / 1000);
  return Response.json({
    status: 'rate_limited',
    message: `Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${seconds} giây.`,
    retry_after: seconds,
    rate_limit_group: group,
  }, { status: 429, headers: { 'Retry-After': String(seconds) } });
};

const recordRateLimit = async (response: Response, path: string, method: string) => {
  const body: unknown = await response.clone().json().catch(() => null);
  const data = body && typeof body === 'object'
    ? body as { retry_after?: unknown; rate_limit_group?: unknown }
    : {};
  const retryHeader = response.headers.get('Retry-After');
  const headerSeconds = retryHeader
    ? (/^\d+(\.\d+)?$/.test(retryHeader) ? Number(retryHeader) : (Date.parse(retryHeader) - Date.now()) / 1000)
    : 0;
  const bodySeconds = Number(data.retry_after);
  const seconds = Math.max(
    Number.isFinite(headerSeconds) ? headerSeconds : 0,
    Number.isFinite(bodySeconds) ? bodySeconds : 0,
    0,
  );
  const until = Date.now() + (seconds > 0 ? seconds : 60) * 1000;
  // The gateway counts a whole group, not just this URL. Persist across reloads/tabs.
  const groups = new Set([rateLimitGroup(path, method)]);
  if (typeof data.rate_limit_group === 'string') groups.add(data.rate_limit_group);
  for (const group of groups) {
    const key = cooldownKey(group);
    let existing = cooldowns.get(key) || 0;
    try { existing = Math.max(existing, Number(localStorage.getItem(key)) || 0); } catch { /* Storage is optional. */ }
    const expiry = Math.max(until, existing);
    cooldowns.set(key, expiry);
    try { localStorage.setItem(key, String(expiry)); } catch { /* Keep the in-memory cooldown. */ }
  }
};

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

  const method = (options.method || 'GET').toUpperCase();
  if (options.signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
  const delay = getApiRetryDelay(path, method);
  if (delay > 0) return limitedResponse(delay, rateLimitGroup(path, method));

  const url = apiUrl(path);
  const perform = async (signal?: AbortSignal) => {
    const response = await fetch(url, {
      ...options, method, headers, signal, cache: options.cache ?? 'no-store',
    });
    if (response.status === 429) await recordRateLimit(response, path, method);
    if (method !== 'GET' && response.ok) clearApiCache();
    return response;
  };

  // Mutations are never shared or retried automatically.
  if (method !== 'GET' || typeof window === 'undefined') return perform(options.signal ?? undefined);

  const key = JSON.stringify([url, [...headers.entries()].sort(), options.credentials, options.cache ?? 'no-store', cacheVersion]);
  const cached = responseCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.response.clone();
  responseCache.delete(key);

  let entry = inFlight.get(key);
  if (!entry) {
    const controller = new AbortController();
    const version = cacheVersion;
    const promise = perform(controller.signal).then(async response => {
      // Buffer once so every consumer owns a readable response body.
      const body = response.status === 204 || response.status === 205 ? null : await response.arrayBuffer();
      const buffered = new Response(body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
      if (response.ok && version === cacheVersion && !controller.signal.aborted) {
        const pathname = path.replace(/^\/+/, '').split('?')[0];
        const ttl = pathname === 'cities' || pathname.startsWith('districts/') ? 300_000 : 1000;
        if (responseCache.size >= 100) responseCache.delete(responseCache.keys().next().value!);
        responseCache.set(key, { response: buffered, expires: Date.now() + ttl });
      }
      return buffered;
    }).finally(() => { if (inFlight.get(key)?.controller === controller) inFlight.delete(key); });
    entry = { controller, promise, consumers: 0 };
    inFlight.set(key, entry);
  }

  const shared = entry;
  shared.consumers += 1;
  return new Promise<Response>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      settled = true;
      options.signal?.removeEventListener('abort', onAbort);
      shared.consumers -= 1;
      // Allow the Strict Mode remount to subscribe before cancelling transport.
      if (shared.consumers === 0) setTimeout(() => {
        if (shared.consumers === 0 && inFlight.get(key) === shared) {
          inFlight.delete(key);
          shared.controller.abort();
        }
      }, 0);
    };
    const onAbort = () => {
      if (settled) return;
      finish();
      reject(new DOMException('Request aborted', 'AbortError'));
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });
    shared.promise.then(response => {
      if (settled) return;
      finish();
      resolve(response.clone());
    }, error => {
      if (settled) return;
      finish();
      reject(error);
    });
  });
};
