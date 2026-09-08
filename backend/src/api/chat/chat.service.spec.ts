import { ChatService } from './chat.service';
import { IntentService } from './intent.service';
import { TransactionService } from '../transaction/transaction.service';
import { workflowFixture } from '../../testing/workflow-fixture';

describe('Message delivery and read tracking', () => {
  let fixture: ReturnType<typeof workflowFixture>;
  let service: ChatService;
  let intent: { isNegotiating: jest.Mock };
  beforeEach(() => {
    fixture = workflowFixture();
    intent = { isNegotiating: jest.fn().mockResolvedValue(false) };
    service = new ChatService(
      fixture.db,
      new TransactionService(fixture.db),
      intent as unknown as IntentService,
    );
  });

  it('persists one message when a sender retries with the same client message ID', async () => {
    const input = {
      receiverId: 'seller',
      postId: 1,
      content: 'Mình muốn trao đổi thêm',
      clientMessageId: 'request-one',
    };
    await service.send('buyer', input);
    await service.send('buyer', input);
    expect(fixture.data.message).toHaveLength(1);
    expect(fixture.data.notification).toHaveLength(1);
    expect(fixture.data.notification[0]).toMatchObject({
      userId: 'seller', type: 'MESSAGE', isRead: false,
      eventKey: `message:${fixture.data.message[0].id}`,
      link: '/chat?receiverId=buyer&postId=1',
    });
    expect(intent.isNegotiating).toHaveBeenCalledTimes(1);
  });

  it('keeps the saved message if AI or downstream analysis is unavailable', async () => {
    intent.isNegotiating.mockRejectedValue(new Error('offline'));
    const result = await service.send('buyer', {
      receiverId: 'seller',
      postId: 1,
      content: 'Xin chào',
      clientMessageId: 'one',
    });
    expect(result.message.text).toBe('Xin chào');
    expect(fixture.data.message).toHaveLength(1);
    expect(fixture.data.transaction).toHaveLength(0);
    expect(fixture.data.notification).toHaveLength(1);
  });

  it('creates five receiver notifications for five identical texts with distinct request IDs', async () => {
    for (let i = 0; i < 5; i++) await service.send('buyer', {
      receiverId: 'seller', postId: 1, content: 'hello', clientMessageId: `request-${i}`,
    });
    expect(fixture.data.notification).toHaveLength(5);
    expect(new Set(fixture.data.notification.map(item => item.eventKey)).size).toBe(5);
    expect(fixture.data.notification.every(item => item.userId === 'seller')).toBe(true);
  });

  it('deduplicates concurrent retries inside the message transaction', async () => {
    const input = { receiverId: 'seller', postId: 1, content: 'hello', clientMessageId: 'same' };
    await Promise.all([service.send('buyer', input), service.send('buyer', input)]);
    expect(fixture.data.message).toHaveLength(1);
    expect(fixture.data.notification).toHaveLength(1);
  });

  it('rolls back message persistence if notification creation fails, then permits retry', async () => {
    fixture.db.notification.createMany.mockRejectedValueOnce(new Error('notification unavailable'));
    const input = { receiverId: 'seller', postId: 1, content: 'hello', clientMessageId: 'retry' };
    await expect(service.send('buyer', input)).rejects.toThrow('notification unavailable');
    expect(fixture.data.message).toHaveLength(0);
    expect(fixture.data.notification).toHaveLength(0);
    await service.send('buyer', input);
    expect(fixture.data.message).toHaveLength(1);
    expect(fixture.data.notification).toHaveLength(1);
  });

  it('does not create a notification on a failed message write or invalid send', async () => {
    fixture.db.message.upsert.mockRejectedValueOnce(new Error('write failed'));
    const input = { receiverId: 'seller', postId: 1, content: 'hello', clientMessageId: 'fail' };
    await expect(service.send('buyer', input)).rejects.toThrow('write failed');
    await expect(service.send('buyer', { ...input, receiverId: 'buyer' })).rejects.toThrow();
    await expect(service.send('buyer', { ...input, content: ' ' })).rejects.toThrow();
    expect(fixture.data.notification).toHaveLength(0);
  });

  it('links direct chat notifications without a listing', async () => {
    await service.send('buyer', { receiverId: 'seller', content: 'hello', clientMessageId: 'direct' });
    expect(fixture.data.notification[0].link).toBe('/chat?receiverId=buyer');
  });

  it('rejects reuse of a request ID for another message and rejects chat about someone else’s listing', async () => {
    const input = {
      receiverId: 'seller',
      postId: 1,
      content: 'Xin chào',
      clientMessageId: 'one',
    };
    await service.send('buyer', input);
    await expect(
      service.send('buyer', { ...input, content: 'Nội dung khác' }),
    ).rejects.toThrow();
    await expect(
      service.send('buyer', { ...input, receiverId: 'other', clientMessageId: 'two' }),
    ).rejects.toThrow();
  });

  it('only marks received messages in the selected listing/conversation through the viewed message', async () => {
    fixture.data.message.push(
      { id: 1, senderId: 'seller', receiverId: 'buyer', postId: 1, readAt: null },
      { id: 2, senderId: 'seller', receiverId: 'buyer', postId: 1, readAt: null },
      { id: 3, senderId: 'seller', receiverId: 'buyer', postId: 2, readAt: null },
      { id: 4, senderId: 'buyer', receiverId: 'seller', postId: 1, readAt: null },
    );
    const result = await service.markRead(
      'buyer',
      { receiverId: 'seller', postId: 1 },
      1,
    );
    expect(result.unreadCount).toBe(2);
    expect(fixture.data.message[0].readAt).toBeInstanceOf(Date);
    expect(
      fixture.data.message.slice(1).every((message) => message.readAt === null),
    ).toBe(true);
  });

  it('scopes deletion to the authenticated participant and selected listing', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    fixture.db.message.deleteMany = deleteMany;
    await service.deleteConversation('buyer', { receiverId: 'seller', postId: 1 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        postId: 1,
        OR: [
          { senderId: 'buyer', receiverId: 'seller' },
          { senderId: 'seller', receiverId: 'buyer' },
        ],
      },
    });
  });

  it('preserves messages attached to an ongoing transaction', async () => {
    fixture.data.transaction.push({
      id: 'agreement',
      buyerId: 'buyer',
      sellerId: 'seller',
      postId: 1,
      status: 'NEGOTIATING',
    });
    const deleteMany = jest.fn();
    fixture.db.message.deleteMany = deleteMany;
    await expect(
      service.deleteConversation('buyer', {
        receiverId: 'seller',
        postId: 1,
      }),
    ).rejects.toThrow('Không thể xóa');
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
