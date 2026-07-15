import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MasterService } from './master.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@ApiTags('master')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MasterController {
  constructor(private readonly master: MasterService) {}

  @Get('partners')
  @RequirePermissions('partners.read')
  partners(@CurrentUser() u: AuthUser, @Query('type') type?: string) {
    return this.master.listPartners(u.companyId, type);
  }

  @Post('partners')
  @RequirePermissions('partners.write')
  createPartner(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.master.upsertPartner(u.companyId, body);
  }

  @Put('partners/:id')
  @RequirePermissions('partners.write')
  updatePartner(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.master.upsertPartner(u.companyId, body, id);
  }

  @Delete('partners/:id')
  @RequirePermissions('partners.write')
  deletePartner(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.master.deletePartner(u.companyId, id);
  }

  @Get('warehouses')
  @RequirePermissions('warehouses.read')
  warehouses(@CurrentUser() u: AuthUser) {
    return this.master.listWarehouses(u.companyId);
  }

  @Post('warehouses')
  @RequirePermissions('warehouses.write')
  createWh(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.master.upsertWarehouse(u.companyId, body);
  }

  @Put('warehouses/:id')
  @RequirePermissions('warehouses.write')
  updateWh(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.master.upsertWarehouse(u.companyId, body, id);
  }

  @Get('product-attributes')
  @RequirePermissions('attributes.read')
  attributes(@CurrentUser() u: AuthUser) {
    return this.master.listAttributes(u.companyId);
  }

  @Post('product-attributes')
  @RequirePermissions('attributes.write')
  createAttr(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.master.upsertAttribute(u.companyId, body);
  }

  @Put('product-attributes/:id')
  @RequirePermissions('attributes.write')
  updateAttr(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.master.upsertAttribute(u.companyId, body, id);
  }

  @Get('products')
  @RequirePermissions('products.read')
  products(@CurrentUser() u: AuthUser) {
    return this.master.listProducts(u.companyId);
  }

  @Get('products/:id')
  @RequirePermissions('products.read')
  product(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.master.getProduct(u.companyId, id);
  }

  @Post('products')
  @RequirePermissions('products.write')
  createProduct(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.master.upsertProduct(u.companyId, body);
  }

  @Put('products/:id')
  @RequirePermissions('products.write')
  updateProduct(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.master.upsertProduct(u.companyId, body, id);
  }

  @Delete('products/:id')
  @RequirePermissions('products.write')
  deleteProduct(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.master.deleteProduct(u.companyId, id);
  }
}
