import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales-summary')
  @RequirePermissions('reports.read')
  sales(
    @CurrentUser() u: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.salesSummary(u.companyId, from, to);
  }

  @Get('inventory-balance')
  @RequirePermissions('reports.read')
  inventory(@CurrentUser() u: AuthUser) {
    return this.reports.inventoryBalance(u.companyId);
  }

  @Get('ar-ap-aging')
  @RequirePermissions('reports.read')
  aging(@CurrentUser() u: AuthUser) {
    return this.reports.arApAging(u.companyId);
  }

  @Get('top-products')
  @RequirePermissions('reports.read')
  topProducts(@CurrentUser() u: AuthUser) {
    return this.reports.topProducts(u.companyId);
  }

  @Get('top-partners')
  @RequirePermissions('reports.read')
  topPartners(@CurrentUser() u: AuthUser) {
    return this.reports.topPartners(u.companyId);
  }

  @Get('cashflow')
  @RequirePermissions('reports.read')
  cashflow(
    @CurrentUser() u: AuthUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.cashflow(u.companyId, from, to);
  }
}
