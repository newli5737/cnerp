import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { loginSchema } from '@cnerp/shared';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookies(res: Response, accessToken: string, refreshToken?: string) {
    const secure = process.env.HTTPS === 'true' || process.env.NODE_ENV === 'production';
    res.cookie('cnerp_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 8 * 60 * 60 * 1000,
    });
    if (refreshToken) {
      res.cookie('cnerp_refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        path: '/api/v1/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = loginSchema.parse(body);
    const result = await this.auth.login(dto);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('cnerp_token');
    res.clearCookie('cnerp_refresh_token', { path: '/api/v1/auth/refresh' });
    return { ok: true };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['cnerp_refresh_token'] as string | undefined;
    if (!token) {
      return { ok: false };
    }
    const result = await this.auth.refresh(token);
    this.setCookies(res, result.accessToken);
    return { ok: true, permissions: result.permissions };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }
}
