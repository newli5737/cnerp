export const PartnerType = {
  CUSTOMER: 'CUSTOMER',
  SUPPLIER: 'SUPPLIER',
  BOTH: 'BOTH',
} as const;

export const AttrDataType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  SELECT: 'SELECT',
} as const;

export const StockMoveType = {
  IN: 'IN',
  OUT: 'OUT',
  TRANSFER: 'TRANSFER',
  ADJUST: 'ADJUST',
} as const;

export const OrderStatus = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  DELIVERED: 'DELIVERED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const;

export const InvoiceType = {
  AR_INVOICE: 'AR_INVOICE',
  AP_INVOICE: 'AP_INVOICE',
} as const;

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export const VoucherType = {
  RECEIPT: 'RECEIPT',
  PAYMENT: 'PAYMENT',
} as const;

export const PERMISSIONS = [
  'dashboard.read',
  'partners.read',
  'partners.write',
  'products.read',
  'products.write',
  'warehouses.read',
  'warehouses.write',
  'attributes.read',
  'attributes.write',
  'inventory.read',
  'inventory.write',
  'sales.read',
  'sales.write',
  'purchase.read',
  'purchase.write',
  'ar.read',
  'ar.write',
  'ap.read',
  'ap.write',
  'vouchers.read',
  'vouchers.write',
  'reports.read',
  'users.read',
  'users.write',
  'roles.read',
  'roles.write',
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];
