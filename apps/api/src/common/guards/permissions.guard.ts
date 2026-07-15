import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException('No user');

    const perms = user.permissions ?? [];
    if (perms.includes('*')) return true;

    const ok = required.every((p) => perms.includes(p));
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
