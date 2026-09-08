import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../api/auth/jwt.strategy';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { NotificationService } from '../api/notification/notification.service';
import { TransactionService } from '../api/transaction/transaction.service';
import { workflowFixture } from '../testing/workflow-fixture';

const { io } = require(require.resolve('socket.io-client', { paths: [process.cwd() + '/../frontend'] }));
const tick = () => new Promise(resolve => setTimeout(resolve, 30));
const date = new Date('2026-09-08T01:00:00Z');
const warning = { id: 1, userId: 'buyer', type: 'WARNING_POPUP', title: 'warning', content: 'private', isRead: false, createdAt: date, updatedAt: date } as any;
const transaction = { id: 'tx', buyerId: 'buyer', sellerId: 'seller', status: 'VERIFYING', createdAt: date.toISOString(), updatedAt: date.toISOString() } as any;

describe('Authenticated push-only Socket.IO transport', () => {
  let http: HttpServer, server: Server, gateway: RealtimeGateway, realtime: RealtimeService, url: string;
  const jwt = new JwtService({ secret: 'socket-test-only' });
  let clients: any[];
  beforeEach(async () => {
    clients = []; http = createServer((_req, res) => { res.statusCode = 403; res.end(); });
    server = new Server(http, { transports: ['websocket'] });
    realtime = new RealtimeService();
    const identity = { validate: jest.fn(async payload => {
      if (payload.sub === 'locked') throw new Error();
      return { userId: payload.sub, role: payload.sub === 'admin' ? 'ADMIN' : 'USER' };
    }) } as unknown as JwtStrategy;
    gateway = new RealtimeGateway(jwt, identity, realtime); gateway.afterInit(server);
    server.on('connection', socket => { gateway.handleConnection(socket); socket.on('disconnect', () => gateway.handleDisconnect(socket)); });
    await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  });
  afterEach(async () => { clients.forEach(client => client.disconnect()); await new Promise<void>(resolve => server.close(() => resolve())); });
  function connect(token?: string) {
    return new Promise<any>(resolve => {
      const client = io(url, { transports: ['websocket'], auth: { token }, reconnection: false }); clients.push(client);
      client.once('connect', () => resolve({ client })); client.once('connect_error', error => resolve({ error }));
    });
  }
  const token = (sub: string, seconds = 60) => jwt.sign({ sub, role: 'ADMIN' }, { expiresIn: seconds });
  it('rejects missing/invalid/expired JWT and locked account', async () => {
    for (const value of [undefined, 'bad', token('buyer', -1), token('locked')]) {
      const result = await connect(value); expect(result.error?.data?.code).toBe('AUTH_INVALID');
    }
    expect(server.sockets.sockets.size).toBe(0);
  });
  it('joins only verified identity rooms; forged role and client join cannot grant access', async () => {
    const { client } = await connect(token('buyer'));
    await connect(token('admin'));
    client.emit('join', 'user:seller'); client.emit('join', 'role:ADMIN'); await tick();
    const sockets = [...server.sockets.sockets.values()];
    const buyer = sockets.find(socket => socket.data.identity.userId === 'buyer')!;
    expect(buyer.rooms.has('user:buyer')).toBe(true); expect(buyer.rooms.has('user:seller')).toBe(false); expect(buyer.rooms.has('role:ADMIN')).toBe(false);
    expect(sockets.find(socket => socket.data.identity.userId === 'admin')!.rooms.has('role:ADMIN')).toBe(true);
  });
  it('delivers warning to owner only; transaction to buyer/seller/admin; invoice owner/admin only', async () => {
    const received: Record<string, string[]> = {};
    for (const id of ['buyer', 'seller', 'admin', 'outsider']) {
      const { client } = await connect(token(id)); received[id] = [];
      client.onAny(event => received[id].push(event));
    }
    realtime.warning(warning);
    realtime.publish({ transactions: [], invoices: [] }, { transactions: [transaction], invoices: [{ id: 'inv', userId: 'seller', amount: '100', updatedAt: date.toISOString() } as any] });
    await tick();
    expect(received.buyer).toEqual(['warning:new', 'transaction:updated']);
    expect(received.seller).toEqual(['transaction:updated', 'invoice:updated']);
    expect(received.admin).toEqual(['transaction:updated', 'invoice:updated']); expect(received.outside ?? received.outsider).toEqual([]);
    realtime.warning({ ...warning, isRead: true }); await tick(); expect(received.buyer.at(-1)).toBe('warning:acknowledged');
  });
  it('disconnects an already connected socket at JWT expiry', async () => {
    const { client } = await connect(token('buyer', 1));
    await new Promise<void>(resolve => client.once('disconnect', () => resolve()));
    expect(server.sockets.sockets.size).toBe(0);
  });
});

describe('Emit only after successful database mutation', () => {
  it('warning creation failure emits nothing; success and owned acknowledgement emit after write', async () => {
    const emit = jest.fn(); const db = { notification: { create: jest.fn().mockRejectedValueOnce(new Error('write failed')).mockResolvedValue(warning), updateMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ ...warning, isRead: true }) } };
    const service = new NotificationService(db as any, { warning: emit } as any);
    await expect(service.createNotification(warning)).rejects.toThrow(); expect(emit).not.toHaveBeenCalled();
    await service.createNotification(warning); expect(emit).toHaveBeenCalledWith(warning);
    await service.markAsRead(1, 'buyer'); expect(emit).toHaveBeenLastCalledWith(expect.objectContaining({ isRead: true }));
    emit.mockClear(); db.notification.updateMany.mockResolvedValue({ count: 0 }); await service.markAsRead(1, 'other'); expect(emit).not.toHaveBeenCalled();
  });
  it('centralized workflow hook includes bulk changes and does not emit on rollback', async () => {
    const fixture = workflowFixture(); let commit = false;
    const original = fixture.db.$transaction;
    fixture.db.$transaction = jest.fn(async action => { commit = false; const result = await original(action); commit = true; return result; });
    const capture = jest.fn(async () => ({ transactions: structuredClone(fixture.data.transaction), invoices: structuredClone(fixture.data.invoice) }));
    const publish = jest.fn(() => expect(commit).toBe(true));
    const service = new TransactionService(fixture.db, { capture, publish } as any);
    const first = await service.triggerEscrowVerification(1, 'buyer', 'seller');
    await service.triggerEscrowVerification(1, 'other', 'seller');
    await service.verifyTransaction(first!.id, 'buyer', true, 'VERIFYING');
    await service.verifyTransaction(first!.id, 'seller', true, 'VERIFYING');
    const after = (publish.mock.calls.at(-1) as any)[1];
    expect(after.transactions.some(row => row.status === 'CANCELLED')).toBe(true);
    publish.mockClear(); await expect(service.verifyTransaction(first!.id, 'outsider', true, 'VERIFYING')).rejects.toThrow(); expect(publish).not.toHaveBeenCalled();
  });
});
