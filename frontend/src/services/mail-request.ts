import { apiFetch } from './api';

const MAIL_REQUEST_TIMEOUT_MS = 25_000;

// Only the two email actions use this deadline; shared API policies stay unchanged.
export async function mailRequest(
  path: 'auth/forgot-password' | 'admin/contacts/reply',
  payload: Record<string, unknown>,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('Yêu cầu gửi thư quá thời gian chờ. Vui lòng kiểm tra hộp thư hoặc trạng thái liên hệ trước khi thử lại.'));
      controller.abort();
    }, MAIL_REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      (async () => {
        const response = await apiFetch(path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        const data: { message?: string | string[] } | null = await response.json().catch(() => null);
        return { response, data };
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
