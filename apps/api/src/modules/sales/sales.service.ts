import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { salesOrderSchema } from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SequenceService } from '../../common/prisma/sequence.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: SequenceService,
    private readonly inventory: InventoryService,
  ) {}

  list(companyId: string) {
    return this.prisma.salesOrder.findMany({
      where: { companyId },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        partner: true,
        warehouse: true,
        company: true,
        lines: { include: { product: true } },
        invoices: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(companyId: string, body: unknown) {
    const dto = salesOrderSchema.parse(body);
    const code = await this.seq.next(companyId, 'SO', 'SO');

    let subtotal = new Prisma.Decimal(0);
    let vatTotal = new Prisma.Decimal(0);

    const lines = dto.lines.map((l, i) => {
      const lineAmount = new Prisma.Decimal(l.qty).mul(l.unitPrice);
      const vatRate = new Prisma.Decimal(l.vatRate ?? 10);
      const vatAmount = lineAmount.mul(vatRate).div(100);
      const lineTotal = lineAmount.add(vatAmount);
      subtotal = subtotal.add(lineAmount);
      vatTotal = vatTotal.add(vatAmount);
      return {
        productId: l.productId,
        qty: l.qty,
        unitPrice: l.unitPrice,
        vatRate,
        vatAmount,
        lineAmount,
        lineTotal,
        lineNo: i + 1,
      };
    });

    const totalAmount = subtotal.add(vatTotal);

    return this.prisma.salesOrder.create({
      data: {
        companyId,
        code,
        partnerId: dto.partnerId,
        warehouseId: dto.warehouseId,
        orderDate: new Date(dto.orderDate),
        note: dto.note || null,
        subtotalAmount: subtotal,
        vatAmount: vatTotal,
        totalAmount,
        lines: { create: lines },
      },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    });
  }

  async confirm(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, companyId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.status !== 'DRAFT') {
      throw new BadRequestException({ code: 'ONLY_DRAFT_CONFIRM', message: 'Only DRAFT can confirm' });
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: { partner: true, warehouse: true, lines: { include: { product: true } } },
    });
  }

  async deliver(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: { lines: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.status !== 'CONFIRMED') {
      throw new BadRequestException({
        code: 'MUST_CONFIRM_FIRST',
        message: 'Confirm order before deliver',
      });
    }

    const existingInv = await this.prisma.invoice.findFirst({
      where: { salesOrderId: order.id },
    });
    if (existingInv) {
      throw new BadRequestException({
        code: 'ALREADY_DELIVERED',
        message: 'Order already delivered',
      });
    }

    const stockCode = await this.seq.next(companyId, 'STOCK', 'ST');
    const invCode = await this.seq.next(companyId, 'AR', 'AR');

    return this.prisma.$transaction(async (tx) => {
      await this.inventory.postReferencedMove(tx, {
        companyId,
        warehouseId: order.warehouseId,
        moveType: 'OUT',
        referenceType: 'SALES_ORDER',
        referenceId: order.id,
        code: stockCode,
        moveDate: new Date(),
        lines: order.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitCost: Number(l.product.costPrice),
        })),
      });

      await tx.invoice.create({
        data: {
          companyId,
          partnerId: order.partnerId,
          type: 'AR_INVOICE',
          code: invCode,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 86400000),
          totalAmount: order.totalAmount,
          status: 'POSTED',
          salesOrderId: order.id,
        },
      });

      return tx.salesOrder.update({
        where: { id },
        data: { status: 'DELIVERED' },
        include: {
          partner: true,
          warehouse: true,
          lines: { include: { product: true } },
          invoices: true,
        },
      });
    });
  }

  async cancel(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, companyId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
    if (order.status === 'DELIVERED') {
      throw new BadRequestException({
        code: 'CANNOT_CANCEL_DELIVERED',
        message: 'Cannot cancel delivered',
      });
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
