import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  permissions: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    let token = request.cookies?.['cnerp_token'] as string | undefined;

    if (!token) {
      const authHeader = request.headers.authorization as string | undefined;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
