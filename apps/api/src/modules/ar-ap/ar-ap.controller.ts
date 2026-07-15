import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArApService } from './ar-ap.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ar-ap')
@Controller('ar-ap')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArApController {
  constructor(private readonly arAp: ArApService) {}

  @Get('invoices')
  @RequirePermissions('ar.read')
  invoices(@CurrentUser() u: AuthUser, @Query('type') type?: string) {
    return this.arAp.listInvoices(u.companyId, type);
  }

  @Get('partner-balances')
  @RequirePermissions('ar.read')
  balances(@CurrentUser() u: AuthUser) {
    return this.arAp.partnerBalances(u.companyId);
  }
}
