import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { purchaseOrderSchema } from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SequenceService } from '../../common/prisma/sequence.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: SequenceService,
    private readonly inventory: InventoryService,
  ) {}

  list(companyId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { companyId },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(companyId: string, body: unknown) {
    const dto = purchaseOrderSchema.parse(body);
    const code = await this.seq.next(companyId, 'PO', 'PO');
    let total = new Prisma.Decimal(0);
    const lines = dto.lines.map((l, i) => {
      const amt = new Prisma.Decimal(l.qty).mul(l.unitCost);
      total = total.add(amt);
      return {
        productId: l.productId,
        qty: l.qty,
        unitCost: l.unitCost,
        lineAmount: amt,
        lineNo: i + 1,
      };
    });

    return this.prisma.purchaseOrder.create({
      data: {
        companyId,
        code,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: new Date(dto.orderDate),
        note: dto.note || null,
        totalAmount: total,
        lines: { create: lines },
      },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    });
  }

  async confirm(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'DRAFT') throw new BadRequestException('Only DRAFT can confirm');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    });
  }

  async receive(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'CONFIRMED' && order.status !== 'DRAFT') {
      throw new BadRequestException('Invalid status for receive');
    }

    const stockCode = await this.seq.next(companyId, 'STOCK', 'ST');
    const invCode = await this.seq.next(companyId, 'AP', 'AP');

    return this.prisma.$transaction(async (tx) => {
      await this.inventory.postReferencedMove(tx, {
        companyId,
        warehouseId: order.warehouseId,
        moveType: 'IN',
        referenceType: 'PURCHASE_ORDER',
        referenceId: order.id,
        code: stockCode,
        moveDate: new Date(),
        lines: order.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitCost: Number(l.unitCost),
        })),
      });

      await tx.invoice.create({
        data: {
          companyId,
          partnerId: order.partnerId,
          type: 'AP_INVOICE',
          code: invCode,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          totalAmount: order.totalAmount,
          status: 'POSTED',
          purchaseOrderId: order.id,
        },
      });

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: {
          partner: true,
          warehouse: true,
          lines: { include: { product: true } },
          invoices: true,
        },
      });
    });
  }
}
