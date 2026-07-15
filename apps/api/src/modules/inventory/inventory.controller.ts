import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('balances')
  @RequirePermissions('inventory.read')
  balances(@CurrentUser() u: AuthUser) {
    return this.inventory.listBalances(u.companyId);
  }

  @Get('moves')
  @RequirePermissions('inventory.read')
  moves(@CurrentUser() u: AuthUser) {
    return this.inventory.listMoves(u.companyId);
  }

  @Post('moves')
  @RequirePermissions('inventory.write')
  create(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.inventory.createMove(u.companyId, body);
  }
}
