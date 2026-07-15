import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('rbac')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @RequirePermissions('roles.read')
  permissions() {
    return this.rbac.listPermissions();
  }

  @Get('roles')
  @RequirePermissions('roles.read')
  roles(@CurrentUser() u: AuthUser) {
    return this.rbac.listRoles(u.companyId);
  }

  @Post('roles')
  @RequirePermissions('roles.write')
  createRole(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.rbac.upsertRole(u.companyId, body);
  }

  @Put('roles/:id')
  @RequirePermissions('roles.write')
  updateRole(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.rbac.upsertRole(u.companyId, body, id);
  }

  @Get('users')
  @RequirePermissions('users.read')
  users(@CurrentUser() u: AuthUser) {
    return this.rbac.listUsers(u.companyId);
  }

  @Post('users')
  @RequirePermissions('users.write')
  createUser(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.rbac.upsertUser(u.companyId, body);
  }

  @Put('users/:id')
  @RequirePermissions('users.write')
  updateUser(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.rbac.upsertUser(u.companyId, body, id);
  }
}
