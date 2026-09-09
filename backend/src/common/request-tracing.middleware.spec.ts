import { Logger } from '@nestjs/common';
import express from 'express';
import request from 'supertest';
import { requestTracing } from './request-tracing.middleware';

describe('Forgot-password request tracing', () => {
  const id = '5c117481-6114-4cf7-b019-ac87d44df6bd';
  let log: jest.SpyInstance;
  beforeEach(() => { log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  function app(status: number) {
    const server = express();
    server.use(requestTracing);
    server.use((_req, res) => { res.status(status).json({ status }); });
    return server;
  }

  it.each([201, 403, 429, 503])('preserves ID and logs actual outgoing %s without changing the response', async status => {
    const result = await request(app(status)).post('/auth/forgot-password?token=secret-query')
      .set('X-Request-Id', id).set('Authorization', 'Bearer secret-jwt')
      .set('X-Security-Gateway-Key', 'secret-gateway')
      .send({ email: 'secret-email@example.com', password: 'secret-password' });
    expect(result.status).toBe(status);
    expect(result.headers['x-request-id']).toBe(id);
    expect(log.mock.calls.map(call => call[0])).toEqual([
      `[${id}] incoming POST /auth/forgot-password`, `[${id}] outgoing status=${status}`,
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/secret-|example.com/);
  });

  it.each([undefined, 'invalid-id', 'x'.repeat(200), `${id},${id}`])('replaces absent/invalid IDs with UUID', async supplied => {
    const req = request(app(200)).post('/api/auth/forgot-password');
    if (supplied !== undefined) req.set('X-Request-Id', supplied);
    const result = await req;
    expect(result.headers['x-request-id']).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(JSON.stringify(log.mock.calls)).not.toContain('invalid-id');
  });

  it('keeps concurrent requests distinct and does not trace unrelated token-bearing paths', async () => {
    const server = app(200);
    const [first, second] = await Promise.all([
      request(server).post('/auth/forgot-password'), request(server).post('/auth/forgot-password'),
    ]);
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
    log.mockClear();
    const other = await request(server).get('/auth/callback/secret-token');
    expect(other.headers['x-request-id']).toBeUndefined();
    expect(log).not.toHaveBeenCalled();
  });
});
