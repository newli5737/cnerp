import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MasterModule } from './modules/master/master.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { ArApModule } from './modules/ar-ap/ar-ap.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MasterModule,
    RbacModule,
    InventoryModule,
    SalesModule,
    PurchaseModule,
    ArApModule,
    VouchersModule,
    DashboardModule,
    ReportsModule,
  ],
})
export class AppModule {}
