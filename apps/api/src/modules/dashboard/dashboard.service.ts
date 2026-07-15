import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [salesMonth, openAr, openAp, lowStock, recentOrders] = await Promise.all([
      this.prisma.salesOrder.aggregate({
        where: {
          companyId,
          status: 'DELIVERED',
          orderDate: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.invoice.findMany({
        where: { companyId, type: 'AR_INVOICE', status: { in: ['POSTED', 'PARTIAL'] } },
      }),
      this.prisma.invoice.findMany({
        where: { companyId, type: 'AP_INVOICE', status: { in: ['POSTED', 'PARTIAL'] } },
      }),
      this.prisma.stockBalance.findMany({
        where: { companyId },
        include: { product: true, warehouse: true },
      }),
      this.prisma.salesOrder.findMany({
        where: { companyId },
        include: { partner: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    const arDue = openAr.reduce(
      (s, i) => s.add(new Prisma.Decimal(i.totalAmount).sub(i.paidAmount)),
      new Prisma.Decimal(0),
    );
    const apDue = openAp.reduce(
      (s, i) => s.add(new Prisma.Decimal(i.totalAmount).sub(i.paidAmount)),
      new Prisma.Decimal(0),
    );

    const low = lowStock.filter((b) =>
      new Prisma.Decimal(b.qty).lessThanOrEqualTo(b.product.minStock),
    );

    return {
      salesMonthAmount: Number(salesMonth._sum.totalAmount ?? 0),
      salesMonthCount: salesMonth._count,
      arDue: Number(arDue),
      apDue: Number(apDue),
      lowStockCount: low.length,
      lowStock: low.slice(0, 10).map((b) => ({
        sku: b.product.sku,
        nameVi: b.product.nameVi,
        nameZh: b.product.nameZh,
        qty: Number(b.qty),
        minStock: Number(b.product.minStock),
        warehouse: b.warehouse.nameVi,
      })),
      recentOrders,
    };
  }
}
