import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    if (context.switchToHttp().getRequest().user?.role !== 'ADMIN')
      throw new ForbiddenException('Chỉ quản trị viên được thực hiện thao tác này.');
    return true;
  }
}
