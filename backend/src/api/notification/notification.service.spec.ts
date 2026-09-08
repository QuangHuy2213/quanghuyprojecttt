import { NotificationService } from './notification.service';
import { workflowFixture } from '../../testing/workflow-fixture';

describe('Notification inbox snapshot', () => {
  it('retains unread notifications older than the newest 50 rows and scopes both queries to the user', async () => {
    const { db } = workflowFixture();
    const recent = Array.from({ length: 50 }, (_, i) => ({ id: i + 10, userId: 'buyer', isRead: true }));
    db.notification.findMany.mockResolvedValueOnce(recent).mockResolvedValueOnce([
      { id: 1, userId: 'buyer', isRead: false },
    ]);
    const rows = await new NotificationService(db).getUserNotifications('buyer');
    expect(rows).toHaveLength(51);
    expect(rows.some(item => item.id === 1)).toBe(true);
    expect(db.notification.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { userId: 'buyer' }, take: 50 }));
    expect(db.notification.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { userId: 'buyer', OR: [{ isRead: false }, { type: 'WARNING_POPUP' }] } }));
  });
});
