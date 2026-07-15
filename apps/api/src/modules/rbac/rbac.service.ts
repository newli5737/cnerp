import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { roleSchema, userSchema } from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  }

  listRoles(companyId: string) {
    return this.prisma.role.findMany({
      where: { companyId },
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async upsertRole(companyId: string, body: unknown, id?: string) {
    const dto = roleSchema.parse(body);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });

    return this.prisma.$transaction(async (tx) => {
      let roleId = id;
      if (id) {
        await tx.role.update({
          where: { id },
          data: { nameVi: dto.nameVi, nameZh: dto.nameZh || null, code: dto.code },
        });
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
      } else {
        const created = await tx.role.create({
          data: {
            companyId,
            code: dto.code,
            nameVi: dto.nameVi,
            nameZh: dto.nameZh || null,
          },
        });
        roleId = created.id;
      }
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((p) => ({ roleId: roleId!, permissionId: p.id })),
        });
      }
      return tx.role.findUniqueOrThrow({
        where: { id: roleId! },
        include: { rolePermissions: { include: { permission: true } } },
      });
    });
  }

  listUsers(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
      orderBy: { email: 'asc' },
    });
  }

  async upsertUser(companyId: string, body: unknown, id?: string) {
    const dto = userSchema.parse(body);
    return this.prisma.$transaction(async (tx) => {
      let userId = id;
      if (id) {
        const data: { fullName: string; isActive?: boolean; passwordHash?: string; email: string } = {
          email: dto.email,
          fullName: dto.fullName,
          isActive: dto.isActive ?? true,
        };
        if (dto.password) {
          data.passwordHash = await bcrypt.hash(dto.password, 10);
        }
        await tx.user.update({ where: { id }, data });
        await tx.userRole.deleteMany({ where: { userId: id } });
      } else {
        if (!dto.password) throw new NotFoundException('Password required');
        const created = await tx.user.create({
          data: {
            companyId,
            email: dto.email,
            fullName: dto.fullName,
            passwordHash: await bcrypt.hash(dto.password, 10),
            isActive: dto.isActive ?? true,
          },
        });
        userId = created.id;
      }
      if (dto.roleIds.length) {
        await tx.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: userId!, roleId })),
        });
      }
      return tx.user.findUniqueOrThrow({
        where: { id: userId! },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
          userRoles: { include: { role: true } },
        },
      });
    });
  }
}
