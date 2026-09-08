import { TransactionService } from './transaction.service';
import { workflowFixture } from '../../testing/workflow-fixture';

describe('Negotiation and sale workflow', () => {
  let fixture: ReturnType<typeof workflowFixture>;
  let service: TransactionService;
  beforeEach(() => {
    fixture = workflowFixture();
    service = new TransactionService(fixture.db);
  });

  async function negotiate() {
    const proposal = await service.triggerEscrowVerification(1, 'buyer', 'seller');
    await service.verifyTransaction(proposal!.id, 'buyer', true, 'VERIFYING');
    await service.verifyTransaction(proposal!.id, 'seller', true, 'VERIFYING');
    return proposal!.id;
  }

  it('AI only proposes; both consents hide the post without sale or invoice', async () => {
    const proposal = await service.triggerEscrowVerification(1, 'buyer', 'seller');
    expect(fixture.data.posts[0].status).toBe('ACTIVE');
    expect(fixture.data.notification).toHaveLength(2);
    const first = await service.verifyTransaction(
      proposal!.id,
      'buyer',
      true,
      'VERIFYING',
    );
    expect(first.status).toBe('VERIFYING');
    await service.verifyTransaction(proposal!.id, 'seller', true, 'VERIFYING');
    expect(fixture.data.transaction[0].status).toBe('NEGOTIATING');
    expect(fixture.data.posts[0].status).toBe('HIDDEN');
    expect(fixture.data.invoice).toHaveLength(0);
    expect(fixture.db.$queryRaw).toHaveBeenCalled();
  });

  it('one refusal cancels a proposal without hiding the listing', async () => {
    const proposal = await service.triggerEscrowVerification(1, 'buyer', 'seller');
    await service.verifyTransaction(proposal!.id, 'buyer', false, 'VERIFYING');
    expect(fixture.data.transaction[0].status).toBe('CANCELLED');
    expect(fixture.data.posts[0].status).toBe('ACTIVE');
    expect(await service.triggerEscrowVerification(1, 'buyer', 'seller')).toBeNull();
  });

  it('does not duplicate proposals when messages are analyzed together', async () => {
    await Promise.all([
      service.triggerEscrowVerification(1, 'buyer', 'seller'),
      service.triggerEscrowVerification(1, 'buyer', 'seller'),
    ]);
    expect(fixture.data.transaction).toHaveLength(1);
    expect(fixture.data.notification).toHaveLength(2);
  });

  it('only reserves a post for one buyer and cancels competing proposals', async () => {
    const first = await service.triggerEscrowVerification(1, 'buyer', 'seller');
    const second = await service.triggerEscrowVerification(1, 'other', 'seller');
    await service.verifyTransaction(first!.id, 'buyer', true, 'VERIFYING');
    await service.verifyTransaction(second!.id, 'other', true, 'VERIFYING');
    const results = await Promise.allSettled([
      service.verifyTransaction(first!.id, 'seller', true, 'VERIFYING'),
      service.verifyTransaction(second!.id, 'seller', true, 'VERIFYING'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(
      fixture.data.transaction.filter((tx) => tx.status === 'NEGOTIATING'),
    ).toHaveLength(1);
  });

  it('either party can cancel negotiation and reopen the listing', async () => {
    const id = await negotiate();
    await service.requestCancelAfterSuccess(id, 'buyer', 'Không tiếp tục');
    expect(fixture.data.posts[0].status).toBe('ACTIVE');
    expect(fixture.data.transaction[0].status).toBe('CANCELLED');
    expect(fixture.data.invoice).toHaveLength(0);
  });

  it('seller action plus buyer sale consent produces exactly one draft invoice', async () => {
    const id = await negotiate();
    await service.markPostSold(1, 'seller', '0900000002');
    await service.markPostSold(1, 'seller', '0900000002');
    expect(fixture.data.invoice).toHaveLength(0);
    await service.verifyTransaction(id, 'buyer', true, 'SALE_PENDING');
    await expect(
      service.verifyTransaction(id, 'buyer', true, 'SALE_PENDING'),
    ).rejects.toThrow();
    expect(fixture.data.posts[0].status).toBe('SOLD');
    expect(fixture.data.invoice).toHaveLength(1);
    expect(fixture.data.invoice[0].status).toBe('DRAFT');
    expect(
      fixture.data.notification.filter((item) => item.userId === 'admin'),
    ).toHaveLength(1);
  });

  it('a stale negotiation prompt cannot confirm a later sale step', async () => {
    const id = await negotiate();
    await service.markPostSold(1, 'seller', '0900000002');
    await expect(
      service.verifyTransaction(id, 'buyer', true, 'VERIFYING'),
    ).rejects.toThrow('Trạng thái đã thay đổi');
    expect(fixture.data.invoice).toHaveLength(0);
  });

  it('rejects unrelated users, seller self-confirmation and a different reserved buyer', async () => {
    const id = await negotiate();
    await expect(
      service.requestCancelAfterSuccess(id, 'other', 'test'),
    ).rejects.toThrow();
    await expect(service.markPostSold(1, 'buyer', '0900000003')).rejects.toThrow();
    await expect(service.markPostSold(1, 'seller', '0900000003')).rejects.toThrow();
    await service.markPostSold(1, 'seller', '0900000002');
    await expect(
      service.verifyTransaction(id, 'seller', true, 'SALE_PENDING'),
    ).rejects.toThrow('Chỉ khách hàng');
  });

  it('sale refusal returns to consented negotiation without issuing an invoice', async () => {
    const id = await negotiate();
    await service.markPostSold(1, 'seller', '0900000002');
    await service.verifyTransaction(id, 'buyer', false, 'SALE_PENDING');
    expect(fixture.data.transaction[0].status).toBe('NEGOTIATING');
    expect(fixture.data.invoice).toHaveLength(0);
  });

  it('a refused direct sale never invents prior negotiation consent', async () => {
    const transaction = await service.markPostSold(1, 'seller', '0900000002');
    await service.verifyTransaction(transaction.id, 'buyer', false, 'SALE_PENDING');
    expect(fixture.data.transaction[0].status).toBe('CANCELLED');
    expect(fixture.data.posts[0].status).toBe('ACTIVE');
  });

  it('completed sale cancellation requires the other participant and cancels its unpaid invoice', async () => {
    const id = await negotiate();
    await service.markPostSold(1, 'seller', '0900000002');
    await service.verifyTransaction(id, 'buyer', true, 'SALE_PENDING');
    await service.requestCancelAfterSuccess(id, 'seller', 'Hai bên thống nhất hủy');
    await expect(service.respondToCancelRequest(id, 'other', true)).rejects.toThrow();
    await expect(service.respondToCancelRequest(id, 'seller', true)).rejects.toThrow();
    await expect(service.issueInvoice(fixture.data.invoice[0].id)).rejects.toThrow();
    await service.respondToCancelRequest(id, 'buyer', true);
    expect(fixture.data.posts[0].status).toBe('ACTIVE');
    expect(fixture.data.invoice[0].status).toBe('CANCELLED');
  });

  it('admin cannot force a disputed negotiation into sold', async () => {
    const id = await negotiate();
    fixture.data.transaction[0].status = 'DISPUTE';
    await expect(service.resolveDispute(id, 'SUCCESS')).rejects.toThrow(
      'Admin không thể',
    );
    expect(fixture.data.invoice).toHaveLength(0);
  });
});

// HTTP ownership is independent of the ADMIN role and frontend view scope.
describe('Personal transaction and invoice ownership', () => {
  it('returns only participant transactions and owned invoices, even for an admin ID', async () => {
    const fixture = workflowFixture(), service = new TransactionService(fixture.db);
    fixture.data.transaction.push({ id: 'a', buyerId: 'buyer', sellerId: 'seller', postId: 1 }, { id: 'b', buyerId: 'admin', sellerId: 'other', postId: 1 });
    fixture.data.invoice.push({ id: 'ia', transactionId: 'a', userId: 'seller', amount: 10, status: 'DRAFT', invoiceCode: 'HD-20260908-000001' },
      { id: 'ib', transactionId: 'b', userId: 'admin', amount: 10, status: 'DRAFT', invoiceCode: 'HD-20260908-000002' });
    expect((await service.getUserTransactions('admin')).map(row => row.id)).toEqual(['b']);
    expect((await service.getUserTransactions('buyer')).map(row => row.id)).toEqual(['a']);
    const first = await service.getUserInvoices('admin');
    expect(first.map(row => row.id)).toEqual(['ib']);
    expect((await service.getUserInvoices('buyer'))).toEqual([]);
    expect((await service.getUserInvoices('admin'))[0].invoiceCode).toBe(first[0].invoiceCode);
    const all = await service.getAllInvoices(); expect(all).toHaveLength(2);
    expect(new Set(all.map(row => row.invoiceCode)).size).toBe(2);
  });
});
