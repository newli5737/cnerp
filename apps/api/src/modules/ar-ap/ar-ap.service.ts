import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ArApService {
  constructor(private readonly prisma: PrismaService) {}

  listInvoices(companyId: string, type?: string) {
    return this.prisma.invoice.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      include: { partner: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async partnerBalances(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { not: 'CANCELLED' } },
      include: { partner: true },
    });

    const map = new Map<
      string,
      { partnerId: string; partner: (typeof invoices)[0]['partner']; ar: Prisma.Decimal; ap: Prisma.Decimal }
    >();

    for (const inv of invoices) {
      const remaining = new Prisma.Decimal(inv.totalAmount).sub(inv.paidAmount);
      if (remaining.lte(0)) continue;
      const cur = map.get(inv.partnerId) ?? {
        partnerId: inv.partnerId,
        partner: inv.partner,
        ar: new Prisma.Decimal(0),
        ap: new Prisma.Decimal(0),
      };
      if (inv.type === 'AR_INVOICE') cur.ar = cur.ar.add(remaining);
      else cur.ap = cur.ap.add(remaining);
      map.set(inv.partnerId, cur);
    }

    return [...map.values()].map((v) => ({
      ...v,
      ar: Number(v.ar),
      ap: Number(v.ap),
    }));
  }
}
