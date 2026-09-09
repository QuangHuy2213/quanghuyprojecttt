import { BadRequestException, NotFoundException, ServiceUnavailableException, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { TransactionService } from '../transaction/transaction.service';
import { AdminService } from './admin.service';
import { ReplyContactEmailDto } from './dto/admin.dto';

describe('Admin contact reply email', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const sendContactReply = jest.fn();
  const service = new AdminService(
    { contact: { findUnique, update } } as unknown as PrismaService,
    {} as TransactionService,
    { sendContactReply } as unknown as MailService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    findUnique.mockResolvedValue({ email: 'Owner@example.com' });
    update.mockResolvedValue({ id: 1, status: 'REPLIED' });
  });

  it('uses the DB recipient and waits for acceptance before updating REPLIED', async () => {
    let accept!: () => void;
    sendContactReply.mockReturnValue(new Promise<void>(resolve => { accept = resolve; }));
    const pending = service.replyContactEmail(1, 'owner@example.com', 'Subject', 'Message');
    await Promise.resolve();
    expect(sendContactReply).toHaveBeenCalledWith('Owner@example.com', 'Subject', 'Message');
    expect(update).not.toHaveBeenCalled();
    accept();
    await expect(pending).resolves.toEqual({ id: 1, status: 'REPLIED' });
    expect(update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'REPLIED' } });
  });

  it('does not update when provider fails', async () => {
    sendContactReply.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.replyContactEmail(1, 'owner@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not send to a recipient supplied for a different contact', async () => {
    await expect(service.replyContactEmail(1, 'other@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(BadRequestException);
    expect(sendContactReply).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('does not send for a missing contact', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.replyContactEmail(1, 'owner@example.com', 'Subject', 'Message')).rejects.toBeInstanceOf(NotFoundException);
    expect(sendContactReply).not.toHaveBeenCalled();
  });

  it('accepts only DTO fields; rejects isOpen with the production validation settings', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
    const metadata = { type: 'body' as const, metatype: ReplyContactEmailDto };
    const payload = { contactId: 1, email: 'owner@example.com', subject: 'Subject', message: 'Message' };
    await expect(pipe.transform(payload, metadata)).resolves.toBeInstanceOf(ReplyContactEmailDto);
    await expect(pipe.transform({ ...payload, isOpen: true }, metadata)).rejects.toBeInstanceOf(BadRequestException);
  });
});
