import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sales')
@Controller('sales-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Get()
  @RequirePermissions('sales.read')
  list(@CurrentUser() u: AuthUser) {
    return this.sales.list(u.companyId);
  }

  @Post()
  @RequirePermissions('sales.write')
  create(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.sales.create(u.companyId, body);
  }

  @Post(':id/confirm')
  @RequirePermissions('sales.write')
  confirm(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.sales.confirm(u.companyId, id);
  }

  @Post(':id/deliver')
  @RequirePermissions('sales.write')
  deliver(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.sales.deliver(u.companyId, id);
  }

  @Post(':id/cancel')
  @RequirePermissions('sales.write')
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.sales.cancel(u.companyId, id);
  }
}
