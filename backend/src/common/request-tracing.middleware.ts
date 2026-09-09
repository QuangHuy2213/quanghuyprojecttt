import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger('RequestTrace');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requestTracing(req: Request, res: Response, next: NextFunction) {
  // Trace only this investigation. Never log arbitrary paths (which may contain tokens).
  const path = req.path.toLowerCase().replace(/\/$/, '');
  if (path !== '/auth/forgot-password' && path !== '/api/auth/forgot-password') {
    next();
    return;
  }
  const supplied = req.headers['x-request-id'];
  const requestId = typeof supplied === 'string' && UUID.test(supplied)
    ? supplied.toLowerCase() : randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  logger.log(`[${requestId}] incoming ${req.method} ${path}`);
  res.once('finish', () => {
    logger.log(`[${requestId}] outgoing status=${res.statusCode}`);
  });
  res.once('close', () => {
    if (!res.writableFinished) logger.log(`[${requestId}] outgoing aborted`);
  });
  next();
}
