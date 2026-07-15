import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { LoginDto } from '@cnerp/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async loadPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    const codes = new Set<string>();
    for (const ur of userRoles) {
      if (ur.role.code === 'admin') {
        codes.add('*');
        break;
      }
      for (const rp of ur.role.rolePermissions) {
        codes.add(rp.permission.code);
      }
    }
    return [...codes];
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: { company: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const permissions = await this.loadPermissions(user.id);
    const payload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      permissions,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: 8 * 60 * 60,
    });
    const refreshToken = this.jwt.sign(payload, {
      secret:
        this.config.get<string>('JWT_REFRESH_SECRET') ||
        this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: 7 * 24 * 60 * 60,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        permissions,
        company: {
          id: user.company.id,
          code: user.company.code,
          nameVi: user.company.nameVi,
          nameZh: user.company.nameZh,
        },
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret:
          this.config.get<string>('JWT_REFRESH_SECRET') ||
          this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const permissions = await this.loadPermissions(payload.sub);
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        companyId: payload.companyId,
        permissions,
      };
      const accessToken = this.jwt.sign(newPayload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: 8 * 60 * 60,
      });
      return { accessToken, permissions };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { company: true },
    });
    const permissions = await this.loadPermissions(userId);
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      permissions,
      company: {
        id: user.company.id,
        code: user.company.code,
        nameVi: user.company.nameVi,
        nameZh: user.company.nameZh,
      },
    };
  }
}
