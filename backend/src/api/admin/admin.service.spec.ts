import { AdminService } from './admin.service';
import { TransactionService } from '../transaction/transaction.service';
import { workflowFixture } from '../../testing/workflow-fixture';

describe('Post moderation notifications', () => {
  it('a repeated approval produces one owner notification, even on concurrent requests', async () => {
    const { db, data } = workflowFixture();
    data.posts[0].status = 'PENDING';
    const service = new AdminService(db, new TransactionService(db));
    await Promise.all([service.reviewPost(1, 'ACTIVE'), service.reviewPost(1, 'ACTIVE')]);
    expect(data.notification.filter((item) => item.userId === 'seller')).toHaveLength(1);
    expect(data.posts[0].approvedAt).toBeInstanceOf(Date);
  });

  it('cannot approve a post hidden by an active negotiation', async () => {
    const { db, data } = workflowFixture();
    data.posts[0].status = 'HIDDEN';
    const service = new AdminService(db, new TransactionService(db));
    await expect(service.reviewPost(1, 'ACTIVE')).rejects.toThrow();
    expect(data.notification).toHaveLength(0);
  });
});
