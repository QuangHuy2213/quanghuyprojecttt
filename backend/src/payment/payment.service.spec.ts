import { PaymentService } from './payment.service';
import { workflowFixture } from '../testing/workflow-fixture';

describe('Invoice payment realtime commit boundary', () => {
  const originalTmn = process.env.VNP_TMN_CODE, originalSecret = process.env.VNP_HASH_SECRET;
  beforeAll(() => { process.env.VNP_TMN_CODE = 'TESTCODE'; process.env.VNP_HASH_SECRET = 'test-only-secret'; });
  afterAll(() => { if (originalTmn === undefined) delete process.env.VNP_TMN_CODE; else process.env.VNP_TMN_CODE = originalTmn; if (originalSecret === undefined) delete process.env.VNP_HASH_SECRET; else process.env.VNP_HASH_SECRET = originalSecret; });
  it('emits owner invoice only after commit and does not emit again for a payment replay', async () => {
    const fixture = workflowFixture();
    fixture.data.transaction.push({ id: 'tx', postId: 1, status: 'SUCCESS' });
    fixture.data.invoice.push({ id: 'inv', invoiceCode: 'HD-20260908-A8F31C', transactionId: 'tx', userId: 'seller', amount: 100, status: 'PENDING_PAYMENT' });
    let committed = false; const original = fixture.db.$transaction;
    fixture.db.$transaction = jest.fn(async action => { committed = false; const value = await original(action); committed = true; return value; });
    const emit = jest.fn(row => { expect(committed).toBe(true); expect(row.status).toBe('PAID'); });
    const service = new PaymentService(fixture.db, { invoice: emit } as any);
    (service as any).vnpay = { verifyReturnUrl: () => ({ isSuccess: true, vnp_ResponseCode: '00' }) };
    const query = { vnp_TxnRef: 'INVOICE_inv_1', vnp_Amount: '10000' };
    expect((await service.processReturn(query)).success).toBe(true); expect(emit).toHaveBeenCalledTimes(1);
    expect(fixture.data.notification[0].content).toContain('HD-20260908-A8F31C');
    await service.processReturn(query); expect(emit).toHaveBeenCalledTimes(1);
  });
  it('rollback and rejected payment never publish a paid invoice', async () => {
    const fixture = workflowFixture(); fixture.data.transaction.push({ id: 'tx', postId: 1, status: 'SUCCESS' });
    fixture.data.invoice.push({ id: 'inv', invoiceCode: 'HD-20260908-A8F31C', transactionId: 'tx', userId: 'seller', amount: 100, status: 'PENDING_PAYMENT' });
    fixture.db.notification.upsert.mockRejectedValue(new Error('rollback'));
    const emit = jest.fn(), service = new PaymentService(fixture.db, { invoice: emit } as any);
    (service as any).vnpay = { verifyReturnUrl: () => ({ isSuccess: true, vnp_ResponseCode: '00' }) };
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await service.processReturn({ vnp_TxnRef: 'INVOICE_inv_1', vnp_Amount: '10000' })).success).toBe(false);
      expect(emit).not.toHaveBeenCalled(); expect(fixture.data.invoice[0].status).toBe('PENDING_PAYMENT');
    } finally { log.mockRestore(); }
  });
  it('uses persisted invoiceCode in VNPay description, preserves TxnRef and rejects non-owner admin', async () => {
    const fixture = workflowFixture();
    fixture.data.transaction.push({ id: 'tx', postId: 1, status: 'SUCCESS' });
    fixture.data.invoice.push({ id: 'inv', invoiceCode: 'HD-20260908-A8F31C', transactionId: 'tx', userId: 'seller', amount: 100, status: 'PENDING_PAYMENT', dueDate: null });
    const service = new PaymentService(fixture.db);
    const build = jest.fn().mockReturnValue('payment-url');
    (service as any).vnpay = { buildPaymentUrl: build };
    await expect(service.createInvoicePaymentUrl('inv', 'admin', '127.0.0.1', 'https://example.test')).rejects.toThrow();
    expect(build).not.toHaveBeenCalled();
    expect(await service.createInvoicePaymentUrl('inv', 'seller', '127.0.0.1', 'https://example.test')).toBe('payment-url');
    expect(build).toHaveBeenCalledWith(expect.objectContaining({
      vnp_OrderInfo: 'Thanh toan hoa don HD-20260908-A8F31C',
      vnp_TxnRef: expect.stringMatching(/^INVOICE_inv_\d+$/),
    }));
  });
});
