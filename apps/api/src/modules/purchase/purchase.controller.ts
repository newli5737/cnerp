import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PurchaseService } from './purchase.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('purchase')
@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseController {
  constructor(private readonly purchase: PurchaseService) {}

  @Get()
  @RequirePermissions('purchase.read')
  list(@CurrentUser() u: AuthUser) {
    return this.purchase.list(u.companyId);
  }

  @Post()
  @RequirePermissions('purchase.write')
  create(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.purchase.create(u.companyId, body);
  }

  @Post(':id/confirm')
  @RequirePermissions('purchase.write')
  confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.purchase.confirm(u.companyId, id);
  }

  @Post(':id/receive')
  @RequirePermissions('purchase.write')
  receive(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.purchase.receive(u.companyId, id);
  }
}
