export type InboxNotification = {
  id: number;
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
  return result.sort((a, b) => b.id - a.id).slice(0, 50);
}
