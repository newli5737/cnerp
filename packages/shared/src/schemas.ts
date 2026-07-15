import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const partnerSchema = z.object({
  code: z.string().max(50).optional().nullable().or(z.literal('')),
  nameVi: z.string().min(1),
  nameZh: z.string().optional().nullable(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  taxCode: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type PartnerDto = z.infer<typeof partnerSchema>;

export const warehouseSchema = z.object({
  code: z.string().max(50).optional().nullable().or(z.literal('')),
  nameVi: z.string().min(1),
  nameZh: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
export type WarehouseDto = z.infer<typeof warehouseSchema>;

export const productAttributeSchema = z.object({
  code: z.string().min(1).max(50),
  nameVi: z.string().min(1),
  nameZh: z.string().optional().nullable(),
  dataType: z.enum(['TEXT', 'NUMBER', 'SELECT']),
  optionsJson: z.array(z.string()).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export type ProductAttributeDto = z.infer<typeof productAttributeSchema>;

export const productSchema = z.object({
  sku: z.string().max(80).optional().nullable().or(z.literal('')),
  nameVi: z.string().min(1),
  nameZh: z.string().optional().nullable(),
  unit: z.string().default('Cái'),
  salePrice: z.coerce.number().nonnegative().default(0),
  costPrice: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().nonnegative().max(100).default(10),
  minStock: z.coerce.number().nonnegative().default(0),
  isActive: z.boolean().optional(),
  attributes: z
    .array(
      z.object({
        attributeId: z.string().uuid(),
        valueText: z.string().optional().nullable(),
        valueNumber: z.coerce.number().optional().nullable(),
      }),
    )
    .optional(),
});
export type ProductDto = z.infer<typeof productSchema>;

export const salesOrderLineSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  vatRate: z.coerce.number().nonnegative().max(100).default(10),
});

export const salesOrderSchema = z.object({
  partnerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  orderDate: z.string(),
  note: z.string().optional().nullable(),
  lines: z.array(salesOrderLineSchema).min(1),
});
export type SalesOrderDto = z.infer<typeof salesOrderSchema>;

export const purchaseOrderSchema = z.object({
  partnerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  orderDate: z.string(),
  note: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.coerce.number().positive(),
        unitCost: z.coerce.number().nonnegative(),
      }),
    )
    .min(1),
});
export type PurchaseOrderDto = z.infer<typeof purchaseOrderSchema>;

export const stockMoveLineSchema = z.object({
  productId: z.string().uuid(),
  qty: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative().optional(),
});

export const stockMoveSchema = z.object({
  warehouseId: z.string().uuid(),
  toWarehouseId: z.string().uuid().optional().nullable(),
  moveType: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUST']),
  moveDate: z.string(),
  note: z.string().optional().nullable(),
  lines: z.array(stockMoveLineSchema).min(1),
});
export type StockMoveDto = z.infer<typeof stockMoveSchema>;

export const voucherSchema = z.object({
  type: z.enum(['RECEIPT', 'PAYMENT']),
  voucherDate: z.string(),
  partnerId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  note: z.string().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
});
export type VoucherDto = z.infer<typeof voucherSchema>;

export const roleSchema = z.object({
  code: z.string().min(1).max(50),
  nameVi: z.string().min(1),
  nameZh: z.string().optional().nullable(),
  permissionCodes: z.array(z.string()).default([]),
});
export type RoleDto = z.infer<typeof roleSchema>;

export const userSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.string().uuid()).default([]),
});
export type UserDto = z.infer<typeof userSchema>;
