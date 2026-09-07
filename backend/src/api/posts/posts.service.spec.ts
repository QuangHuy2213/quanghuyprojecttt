import { PostsService } from './posts.service';
import { workflowFixture } from '../../testing/workflow-fixture';

describe('Listing lifecycle guards', () => {
  it('blocks direct SOLD updates and prevents editing a reserved listing', async () => {
    const { db, data } = workflowFixture();
    const service = new PostsService(db);
    await expect(
      service.updatePost(1, 'seller', { userId: 'seller', status: 'SOLD' }),
    ).rejects.toThrow();
    data.transaction.push({
      id: 'tx',
      postId: 1,
      buyerId: 'buyer',
      sellerId: 'seller',
      status: 'NEGOTIATING',
    });
    await expect(
      service.updatePost(1, 'seller', { userId: 'seller', status: 'ACTIVE' }),
    ).rejects.toThrow();
    await expect(service.deletePost(1, 'seller')).rejects.toThrow();
  });

  it('does not expose a hidden listing to unrelated visitors but preserves participant access', async () => {
    const { db, data } = workflowFixture();
    data.posts[0].status = 'HIDDEN';
    data.transaction.push({
      id: 'tx',
      postId: 1,
      buyerId: 'buyer',
      sellerId: 'seller',
      status: 'NEGOTIATING',
    });
    const service = new PostsService(db);
    await expect(service.findOnePost(1)).rejects.toThrow();
    await expect(service.findOnePost(1, 'other')).rejects.toThrow();
    expect((await service.findOnePost(1, 'buyer'))?.id).toBe(1);
    expect((await service.findOnePost(1, 'seller'))?.id).toBe(1);
  });

  it('does not let an owner make a rejected listing active without approval', async () => {
    const { db, data } = workflowFixture();
    data.posts[0].status = 'HIDDEN';
    data.posts[0].approvedAt = null;
    const service = new PostsService(db);
    await expect(
      service.updatePost(1, 'seller', { userId: 'seller', status: 'ACTIVE' }),
    ).rejects.toThrow();
  });
});
