// Prisma's TIMESTAMP(3) chat/notification columns store UTC without an offset.
// API Date JSON has Z; Postgres Changes may expose the same value without one.
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const input = value.trim().replace(' ', 'T');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/i.test(input)) return null;
  const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(input);
  const normalized = hasZone ? input.replace(/([+-]\d{2})$/, '$1:00') : `${input}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeTimestamp(value: string): string {
  return parseTimestamp(value)?.toISOString() ?? value;
}

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
export const formatMessageTime = (value: string) => {
  const date = parseTimestamp(value);
  return date ? timeFormat.format(date) : '—';
};
export const formatNotificationTime = (value: string) => {
  const date = parseTimestamp(value);
  return date ? dateTimeFormat.format(date) : '—';
};
