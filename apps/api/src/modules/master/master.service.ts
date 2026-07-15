import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  partnerSchema,
  warehouseSchema,
  productSchema,
  productAttributeSchema,
} from '@cnerp/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class MasterService {
  constructor(private readonly prisma: PrismaService) {}

  // Partners
  listPartners(companyId: string, type?: string) {
    return this.prisma.partner.findMany({
      where: { companyId, ...(type ? { type: { in: [type, 'BOTH'] } } : {}) },
      orderBy: { code: 'asc' },
    });
  }

  async upsertPartner(companyId: string, body: unknown, id?: string) {
    const dto = partnerSchema.parse(body);
    const data = {
      ...dto,
      email: dto.email || null,
      nameZh: dto.nameZh || null,
    };
    if (id) {
      return this.prisma.partner.update({ where: { id }, data });
    }
    return this.prisma.partner.create({ data: { ...data, companyId } });
  }

  async deletePartner(companyId: string, id: string) {
    const p = await this.prisma.partner.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Partner not found');
    return this.prisma.partner.update({ where: { id }, data: { isActive: false } });
  }

  // Warehouses
  listWarehouses(companyId: string) {
    return this.prisma.warehouse.findMany({
      where: { companyId },
      orderBy: { code: 'asc' },
    });
  }

  async upsertWarehouse(companyId: string, body: unknown, id?: string) {
    const dto = warehouseSchema.parse(body);
    const data = { ...dto, nameZh: dto.nameZh || null };
    if (id) return this.prisma.warehouse.update({ where: { id }, data });
    return this.prisma.warehouse.create({ data: { ...data, companyId } });
  }

  // Attributes
  listAttributes(companyId: string) {
    return this.prisma.productAttribute.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async upsertAttribute(companyId: string, body: unknown, id?: string) {
    const dto = productAttributeSchema.parse(body);
    const data = {
      code: dto.code,
      nameVi: dto.nameVi,
      nameZh: dto.nameZh || null,
      dataType: dto.dataType,
      optionsJson: dto.optionsJson ?? Prisma.JsonNull,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };
    if (id) return this.prisma.productAttribute.update({ where: { id }, data });
    return this.prisma.productAttribute.create({ data: { ...data, companyId } });
  }

  // Products
  listProducts(companyId: string) {
    return this.prisma.product.findMany({
      where: { companyId },
      include: { attributeValues: { include: { attribute: true } } },
      orderBy: { sku: 'asc' },
    });
  }

  async getProduct(companyId: string, id: string) {
    const p = await this.prisma.product.findFirst({
      where: { id, companyId },
      include: { attributeValues: { include: { attribute: true } } },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async upsertProduct(companyId: string, body: unknown, id?: string) {
    const dto = productSchema.parse(body);
    const base = {
      sku: dto.sku,
      nameVi: dto.nameVi,
      nameZh: dto.nameZh || null,
      unit: dto.unit,
      salePrice: dto.salePrice,
      costPrice: dto.costPrice,
      minStock: dto.minStock,
      isActive: dto.isActive ?? true,
    };

    return this.prisma.$transaction(async (tx) => {
      let productId = id;
      if (id) {
        await tx.product.update({ where: { id }, data: base });
      } else {
        const created = await tx.product.create({ data: { ...base, companyId } });
        productId = created.id;
      }

      if (dto.attributes) {
        await tx.productAttributeValue.deleteMany({ where: { productId: productId! } });
        for (const a of dto.attributes) {
          await tx.productAttributeValue.create({
            data: {
              productId: productId!,
              attributeId: a.attributeId,
              valueText: a.valueText ?? null,
              valueNumber: a.valueNumber ?? null,
            },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: productId! },
        include: { attributeValues: { include: { attribute: true } } },
      });
    });
  }

  async deleteProduct(companyId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Product not found');
    if (!p) throw new BadRequestException('Invalid');
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }
}
