import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('Admin transaction response', () => {
  it('returns the committed record for immediate frontend merge', async () => {
    const data = { id: 'tx1', status: 'SUCCESS', updatedAt: new Date() };
    const resolveTransactionDispute = jest.fn().mockResolvedValue(data);
    const controller = new AdminController({ resolveTransactionDispute } as unknown as AdminService);
    const result = await controller.resolveTransactionDispute('tx1', 'SUCCESS');
    expect(resolveTransactionDispute).toHaveBeenCalledWith('tx1', 'SUCCESS', undefined);
    expect(result.data).toBe(data);
  });
});
