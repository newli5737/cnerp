import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { stockMoveSchema } from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SequenceService } from '../../common/prisma/sequence.service';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seq: SequenceService,
  ) {}

  listBalances(companyId: string) {
    return this.prisma.stockBalance.findMany({
      where: { companyId },
      include: { product: true, warehouse: true },
      orderBy: [{ warehouse: { code: 'asc' } }, { product: { sku: 'asc' } }],
    });
  }

  listMoves(companyId: string) {
    return this.prisma.stockMove.findMany({
      where: { companyId },
      include: {
        warehouse: true,
        toWarehouse: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async applyDelta(
    tx: Prisma.TransactionClient,
    companyId: string,
    warehouseId: string,
    productId: string,
    delta: Prisma.Decimal,
  ) {
    const existing = await tx.stockBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });
    const next = (existing?.qty ?? new Prisma.Decimal(0)).add(delta);
    if (next.lessThan(0)) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock',
      });
    }
    if (existing) {
      await tx.stockBalance.update({
        where: { id: existing.id },
        data: { qty: next },
      });
    } else {
      await tx.stockBalance.create({
        data: { companyId, warehouseId, productId, qty: next },
      });
    }
  }

  async createMove(companyId: string, body: unknown) {
    const dto = stockMoveSchema.parse(body);
    const code = await this.seq.next(companyId, 'STOCK', 'ST');

    return this.prisma.$transaction(async (tx) => {
      const move = await tx.stockMove.create({
        data: {
          companyId,
          warehouseId: dto.warehouseId,
          toWarehouseId: dto.toWarehouseId || null,
          moveType: dto.moveType,
          code,
          moveDate: new Date(dto.moveDate),
          note: dto.note || null,
          lines: {
            create: dto.lines.map((l, i) => ({
              productId: l.productId,
              qty: l.qty,
              unitCost: l.unitCost ?? 0,
              lineNo: i + 1,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of move.lines) {
        if (dto.moveType === 'IN' || dto.moveType === 'ADJUST') {
          const sign = dto.moveType === 'ADJUST' ? (line.qty as Prisma.Decimal) : line.qty;
          // ADJUST qty is absolute delta passed as positive with note direction — treat positive as IN
          await this.applyDelta(tx, companyId, dto.warehouseId, line.productId, new Prisma.Decimal(sign));
        } else if (dto.moveType === 'OUT') {
          await this.applyDelta(
            tx,
            companyId,
            dto.warehouseId,
            line.productId,
            new Prisma.Decimal(line.qty).neg(),
          );
        } else if (dto.moveType === 'TRANSFER') {
          if (!dto.toWarehouseId) throw new BadRequestException('toWarehouseId required');
          await this.applyDelta(
            tx,
            companyId,
            dto.warehouseId,
            line.productId,
            new Prisma.Decimal(line.qty).neg(),
          );
          await this.applyDelta(
            tx,
            companyId,
            dto.toWarehouseId,
            line.productId,
            new Prisma.Decimal(line.qty),
          );
        }
      }

      return tx.stockMove.findUniqueOrThrow({
        where: { id: move.id },
        include: { lines: { include: { product: true } }, warehouse: true, toWarehouse: true },
      });
    });
  }

  /** Internal helper used by sales/purchase */
  async postReferencedMove(
    tx: Prisma.TransactionClient,
    opts: {
      companyId: string;
      warehouseId: string;
      moveType: 'IN' | 'OUT';
      referenceType: string;
      referenceId: string;
      code: string;
      moveDate: Date;
      lines: { productId: string; qty: number | Prisma.Decimal; unitCost?: number }[];
    },
  ) {
    const move = await tx.stockMove.create({
      data: {
        companyId: opts.companyId,
        warehouseId: opts.warehouseId,
        moveType: opts.moveType,
        referenceType: opts.referenceType,
        referenceId: opts.referenceId,
        code: opts.code,
        moveDate: opts.moveDate,
        lines: {
          create: opts.lines.map((l, i) => ({
            productId: l.productId,
            qty: l.qty,
            unitCost: l.unitCost ?? 0,
            lineNo: i + 1,
          })),
        },
      },
      include: { lines: true },
    });

    for (const line of move.lines) {
      const delta =
        opts.moveType === 'IN'
          ? new Prisma.Decimal(line.qty)
          : new Prisma.Decimal(line.qty).neg();
      await this.applyDelta(tx, opts.companyId, opts.warehouseId, line.productId, delta);
    }
    return move;
  }

  async ensureProductExists(companyId: string, productId: string) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, companyId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }
}
