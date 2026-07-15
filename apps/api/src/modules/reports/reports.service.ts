import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async salesSummary(companyId: string, from?: string, to?: string) {
    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      status: 'DELIVERED',
      ...(from || to
        ? {
            orderDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
    const orders = await this.prisma.salesOrder.findMany({
      where,
      select: { orderDate: true, totalAmount: true, code: true },
      orderBy: { orderDate: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const o of orders) {
      const key = o.orderDate.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + Number(o.totalAmount));
    }
    return {
      series: [...byDay.entries()].map(([date, amount]) => ({ date, amount })),
      total: orders.reduce((s, o) => s + Number(o.totalAmount), 0),
      count: orders.length,
    };
  }

  async inventoryBalance(companyId: string) {
    const rows = await this.prisma.stockBalance.findMany({
      where: { companyId },
      include: { product: true, warehouse: true },
    });
    return rows.map((r) => ({
      warehouseCode: r.warehouse.code,
      warehouseNameVi: r.warehouse.nameVi,
      sku: r.product.sku,
      nameVi: r.product.nameVi,
      nameZh: r.product.nameZh,
      qty: Number(r.qty),
      minStock: Number(r.product.minStock),
      value: Number(r.qty) * Number(r.product.costPrice),
    }));
  }

  async arApAging(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { in: ['POSTED', 'PARTIAL'] } },
      include: { partner: true },
    });
    const today = new Date();
    const buckets = (type: string) => {
      const result = { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };
      for (const inv of invoices.filter((i) => i.type === type)) {
        const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
        if (remaining <= 0) continue;
        const due = inv.dueDate ?? inv.invoiceDate;
        const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
        result.total += remaining;
        if (days <= 30) result.d0_30 += remaining;
        else if (days <= 60) result.d31_60 += remaining;
        else if (days <= 90) result.d61_90 += remaining;
        else result.d90_plus += remaining;
      }
      return result;
    };
    return { ar: buckets('AR_INVOICE'), ap: buckets('AP_INVOICE') };
  }

  async topProducts(companyId: string, limit = 10) {
    const lines = await this.prisma.salesOrderLine.findMany({
      where: { salesOrder: { companyId, status: 'DELIVERED' } },
      include: { product: true },
    });
    const map = new Map<string, { product: (typeof lines)[0]['product']; qty: number; amount: number }>();
    for (const l of lines) {
      const cur = map.get(l.productId) ?? { product: l.product, qty: 0, amount: 0 };
      cur.qty += Number(l.qty);
      cur.amount += Number(l.lineAmount);
      map.set(l.productId, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map((r) => ({
        sku: r.product.sku,
        nameVi: r.product.nameVi,
        nameZh: r.product.nameZh,
        qty: r.qty,
        amount: r.amount,
      }));
  }

  async topPartners(companyId: string, limit = 10) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { companyId, status: 'DELIVERED' },
      include: { partner: true },
    });
    const map = new Map<string, { partner: (typeof orders)[0]['partner']; amount: number; count: number }>();
    for (const o of orders) {
      const cur = map.get(o.partnerId) ?? { partner: o.partner, amount: 0, count: 0 };
      cur.amount += Number(o.totalAmount);
      cur.count += 1;
      map.set(o.partnerId, cur);
    }
    return [...map.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map((r) => ({
        code: r.partner.code,
        nameVi: r.partner.nameVi,
        nameZh: r.partner.nameZh,
        amount: r.amount,
        count: r.count,
      }));
  }

  async cashflow(companyId: string, from?: string, to?: string) {
    const dateFilter = {
      ...(from || to
        ? {
            voucherDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
    const [cash, bank] = await Promise.all([
      this.prisma.cashVoucher.findMany({ where: { companyId, ...dateFilter } }),
      this.prisma.bankVoucher.findMany({ where: { companyId, ...dateFilter } }),
    ]);
    const all = [...cash, ...bank];
    let receipt = 0;
    let payment = 0;
    for (const v of all) {
      if (v.type === 'RECEIPT') receipt += Number(v.amount);
      else payment += Number(v.amount);
    }
    return { receipt, payment, net: receipt - payment, count: all.length };
  }
}
