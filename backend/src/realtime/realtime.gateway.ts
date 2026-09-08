import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtStrategy } from '../api/auth/jwt.strategy';
import { RealtimeService } from './realtime.service';

const origins = ['http://localhost:3000', 'https://nguyenducquanghuy.vercel.app'];
@WebSocketGateway({
  transports: ['websocket'],
  cors: { origin: origins },
  allowRequest: (req, done) => done(null, !req.headers.origin || origins.includes(req.headers.origin)),
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  constructor(private readonly jwt: JwtService, private readonly identity: JwtStrategy, private readonly realtime: RealtimeService) {}
  afterInit(server: Server) {
    this.realtime.attach(server);
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token;
        if (typeof token !== 'string' || !token) throw new Error();
        const payload = await this.jwt.verifyAsync(token);
        if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) throw new Error();
        // Same database-backed identity validation as REST: locked/missing users are rejected,
        // and role changes cannot be spoofed by a stale JWT role claim.
        socket.data.identity = await this.identity.validate(payload);
        socket.data.expiresAt = payload.exp * 1000;
        next();
      } catch {
        const error = new Error('Unauthorized') as Error & { data: { code: string } };
        error.data = { code: 'AUTH_INVALID' };
        next(error);
      }
    });
  }
  handleConnection(socket: Socket) {
    const user = socket.data.identity;
    if (!user || socket.data.expiresAt <= Date.now()) { socket.disconnect(true); return; }
    void socket.join(`user:${user.userId}`);
    if (user.role === 'ADMIN') void socket.join('role:ADMIN');
    socket.data.expiryTimer = setTimeout(() => {
      socket.emit('auth:expired'); socket.disconnect(true);
    }, Math.min(socket.data.expiresAt - Date.now(), 2_147_483_647));
    if (process.env.NODE_ENV !== 'production') this.logger.debug(`[WS CONNECT] user=${user.userId} role=${user.role}`);
    // No join-room or business mutation handlers are registered.
  }
  handleDisconnect(socket: Socket) {
    clearTimeout(socket.data.expiryTimer);
    if (process.env.NODE_ENV !== 'production' && socket.data.identity) this.logger.debug(`[WS DISCONNECT] user=${socket.data.identity.userId}`);
  }
}
