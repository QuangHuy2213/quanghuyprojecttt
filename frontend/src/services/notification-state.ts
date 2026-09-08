export type InboxNotification = {
  id: number;
  userId?: string;
  user_id?: string;
  title: string;
  content: string;
  type: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
  eventKey?: string;
  link?: string;
};

export function mergeNotifications(items: InboxNotification[]) {
  const result: InboxNotification[] = [];
  for (const item of items) {
    if (
      result.some(
        (other) =>
          other.id === item.id || (item.eventKey && other.eventKey === item.eventKey),
      )
    )
      continue;
    // Older rows have no event key. Collapse only identical events a few seconds apart.
    if (
      !item.eventKey &&
      item.type !== 'MESSAGE' &&
      result.some(
        (other) =>
          !other.eventKey &&
          other.type === item.type &&
          other.title === item.title &&
          other.content === item.content &&
          Math.abs(
            Date.parse(other.createdAt || other.created_at || '') -
              Date.parse(item.createdAt || item.created_at || ''),
          ) < 5000,
      )
    )
      continue;
    result.push(item);
  }
  return result.sort((a, b) => b.id - a.id);
}

export function notificationFromRow(row: Record<string, unknown>, userId: string): InboxNotification | null {
  if (row.user_id !== userId || !Number.isInteger(row.id) ||
      typeof row.title !== 'string' || typeof row.content !== 'string' ||
      typeof row.type !== 'string' || typeof row.is_read !== 'boolean' ||
      typeof row.created_at !== 'string') return null;
  return {
    id: row.id as number, userId, title: row.title, content: row.content,
    type: row.type, isRead: row.is_read, createdAt: row.created_at,
    eventKey: typeof row.eventKey === 'string' ? row.eventKey : undefined,
    link: typeof row.link === 'string' ? row.link : undefined,
  };
}
