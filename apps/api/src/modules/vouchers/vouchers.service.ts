import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { voucherSchema } from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SequenceService } from '../../common/prisma/sequence.service';

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: SequenceService,
  ) {}

  listCash(companyId: string) {
    return this.prisma.cashVoucher.findMany({
      where: { companyId },
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listBank(companyId: string) {
    return this.prisma.bankVoucher.findMany({
      where: { companyId },
      include: { partner: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCash(companyId: string, body: unknown) {
    return this.createVoucher(companyId, body, 'cash');
  }

  async createBank(companyId: string, body: unknown) {
    return this.createVoucher(companyId, body, 'bank');
  }

  private async createVoucher(companyId: string, body: unknown, channel: 'cash' | 'bank') {
    const dto = voucherSchema.parse(body);
    const code = await this.seq.next(
      companyId,
      channel === 'cash' ? 'CASH' : 'BANK',
      channel === 'cash' ? 'PT' : 'NH',
    );

    return this.prisma.$transaction(async (tx) => {
      const voucherData = {
        companyId,
        code,
        type: dto.type,
        voucherDate: new Date(dto.voucherDate),
        partnerId: dto.partnerId || null,
        amount: dto.amount,
        note: dto.note || null,
      };

      const voucher =
        channel === 'cash'
          ? await tx.cashVoucher.create({ data: voucherData })
          : await tx.bankVoucher.create({ data: voucherData });

      if (dto.invoiceId) {
        const invoice = await tx.invoice.findFirst({
          where: { id: dto.invoiceId, companyId },
        });
        if (!invoice) throw new NotFoundException('Invoice not found');
        const remaining = new Prisma.Decimal(invoice.totalAmount).sub(invoice.paidAmount);
        if (new Prisma.Decimal(dto.amount).greaterThan(remaining)) {
          throw new BadRequestException('Amount exceeds remaining balance');
        }
        const paid = new Prisma.Decimal(invoice.paidAmount).add(dto.amount);
        const status = paid.greaterThanOrEqualTo(invoice.totalAmount)
          ? 'PAID'
          : 'PARTIAL';

        await tx.invoicePayment.create({
          data: {
            companyId,
            invoiceId: invoice.id,
            amount: dto.amount,
            cashVoucherId: channel === 'cash' ? voucher.id : null,
            bankVoucherId: channel === 'bank' ? voucher.id : null,
          },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: paid, status },
        });
      }

      return voucher;
    });
  }
}
