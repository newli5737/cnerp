import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('vouchers')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get('cash-vouchers')
  @RequirePermissions('vouchers.read')
  listCash(@CurrentUser() u: AuthUser) {
    return this.vouchers.listCash(u.companyId);
  }

  @Post('cash-vouchers')
  @RequirePermissions('vouchers.write')
  createCash(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.vouchers.createCash(u.companyId, body);
  }

  @Get('bank-vouchers')
  @RequirePermissions('vouchers.read')
  listBank(@CurrentUser() u: AuthUser) {
    return this.vouchers.listBank(u.companyId);
  }

  @Post('bank-vouchers')
  @RequirePermissions('vouchers.write')
  createBank(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.vouchers.createBank(u.companyId, body);
  }
}
