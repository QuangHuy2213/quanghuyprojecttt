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
});
