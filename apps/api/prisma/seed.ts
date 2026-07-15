import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from '@cnerp/shared';

const prisma = new PrismaClient();

const PERM_LABELS: Record<string, { vi: string; zh: string; module: string }> = {
  'dashboard.read': { vi: 'Xem tổng quan', zh: '查看仪表盘', module: 'dashboard' },
  'partners.read': { vi: 'Xem đối tác', zh: '查看往来单位', module: 'partners' },
  'partners.write': { vi: 'Sửa đối tác', zh: '编辑往来单位', module: 'partners' },
  'products.read': { vi: 'Xem sản phẩm', zh: '查看产品', module: 'products' },
  'products.write': { vi: 'Sửa sản phẩm', zh: '编辑产品', module: 'products' },
  'warehouses.read': { vi: 'Xem kho', zh: '查看仓库', module: 'warehouses' },
  'warehouses.write': { vi: 'Sửa kho', zh: '编辑仓库', module: 'warehouses' },
  'attributes.read': { vi: 'Xem thuộc tính SP', zh: '查看产品属性', module: 'attributes' },
  'attributes.write': { vi: 'Sửa thuộc tính SP', zh: '编辑产品属性', module: 'attributes' },
  'inventory.read': { vi: 'Xem tồn kho', zh: '查看库存', module: 'inventory' },
  'inventory.write': { vi: 'Nhập xuất kho', zh: '出入库', module: 'inventory' },
  'sales.read': { vi: 'Xem bán hàng', zh: '查看销售', module: 'sales' },
  'sales.write': { vi: 'Sửa bán hàng', zh: '编辑销售', module: 'sales' },
  'purchase.read': { vi: 'Xem mua hàng', zh: '查看采购', module: 'purchase' },
  'purchase.write': { vi: 'Sửa mua hàng', zh: '编辑采购', module: 'purchase' },
  'ar.read': { vi: 'Xem công nợ', zh: '查看应收应付', module: 'ar' },
  'ar.write': { vi: 'Sửa công nợ', zh: '编辑应收应付', module: 'ar' },
  'ap.read': { vi: 'Xem phải trả', zh: '查看应付', module: 'ap' },
  'ap.write': { vi: 'Sửa phải trả', zh: '编辑应付', module: 'ap' },
  'vouchers.read': { vi: 'Xem thu chi', zh: '查看收付款', module: 'vouchers' },
  'vouchers.write': { vi: 'Sửa thu chi', zh: '编辑收付款', module: 'vouchers' },
  'reports.read': { vi: 'Xem báo cáo', zh: '查看报表', module: 'reports' },
  'users.read': { vi: 'Xem người dùng', zh: '查看用户', module: 'users' },
  'users.write': { vi: 'Sửa người dùng', zh: '编辑用户', module: 'users' },
  'roles.read': { vi: 'Xem vai trò', zh: '查看角色', module: 'roles' },
  'roles.write': { vi: 'Sửa vai trò', zh: '编辑角色', module: 'roles' },
};

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@cnerp.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';

  for (const code of PERMISSIONS) {
    const meta = PERM_LABELS[code] ?? { vi: code, zh: code, module: 'misc' };
    await prisma.permission.upsert({
      where: { code },
      create: { code, nameVi: meta.vi, nameZh: meta.zh, module: meta.module },
      update: { nameVi: meta.vi, nameZh: meta.zh, module: meta.module },
    });
  }

  const company = await prisma.company.upsert({
    where: { code: 'CNERP' },
    create: {
      code: 'CNERP',
      nameVi: 'CNERP Demo',
      nameZh: '中越商贸演示公司',
    },
    update: {},
  });

  const allPerms = await prisma.permission.findMany();

  async function upsertRole(
    code: string,
    nameVi: string,
    nameZh: string,
    permCodes: string[] | '*',
  ) {
    const role = await prisma.role.upsert({
      where: { companyId_code: { companyId: company.id, code } },
      create: { companyId: company.id, code, nameVi, nameZh, isSystem: true },
      update: { nameVi, nameZh },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const selected =
      permCodes === '*'
        ? allPerms
        : allPerms.filter((p) => permCodes.includes(p.code));
    if (selected.length) {
      await prisma.rolePermission.createMany({
        data: selected.map((p) => ({ roleId: role.id, permissionId: p.id })),
      });
    }
    return role;
  }

  const adminRole = await upsertRole('admin', 'Quản trị', '管理员', '*');
  await upsertRole('sales', 'Bán hàng', '销售', [
    'dashboard.read',
    'partners.read',
    'partners.write',
    'products.read',
    'sales.read',
    'sales.write',
    'ar.read',
    'inventory.read',
    'reports.read',
  ]);
  await upsertRole('warehouse', 'Kho', '仓管', [
    'dashboard.read',
    'products.read',
    'warehouses.read',
    'inventory.read',
    'inventory.write',
    'purchase.read',
    'purchase.write',
  ]);
  await upsertRole('accountant', 'Công nợ', '财务', [
    'dashboard.read',
    'partners.read',
    'ar.read',
    'ar.write',
    'ap.read',
    'ap.write',
    'vouchers.read',
    'vouchers.write',
    'reports.read',
  ]);
  await upsertRole('viewer', 'Chỉ xem', '只读', [
    'dashboard.read',
    'partners.read',
    'products.read',
    'inventory.read',
    'sales.read',
    'purchase.read',
    'ar.read',
    'reports.read',
  ]);

  const hash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email } },
    create: {
      companyId: company.id,
      email,
      fullName: 'System Admin',
      passwordHash: hash,
    },
    update: { passwordHash: hash },
  });
  await prisma.userRole.deleteMany({ where: { userId: admin.id } });
  await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });

  const wh = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH01' } },
    create: {
      companyId: company.id,
      code: 'WH01',
      nameVi: 'Kho chính',
      nameZh: '主仓库',
    },
    update: {},
  });

  await prisma.partner.upsert({
    where: { companyId_code: { companyId: company.id, code: 'KH001' } },
    create: {
      companyId: company.id,
      code: 'KH001',
      nameVi: 'Công ty ABC',
      nameZh: 'ABC公司',
      type: 'CUSTOMER',
      phone: '0901234567',
    },
    update: {},
  });
  await prisma.partner.upsert({
    where: { companyId_code: { companyId: company.id, code: 'NCC001' } },
    create: {
      companyId: company.id,
      code: 'NCC001',
      nameVi: 'Nhà cung cấp Guangzhou',
      nameZh: '广州供应商',
      type: 'SUPPLIER',
    },
    update: {},
  });

  const colorAttr = await prisma.productAttribute.upsert({
    where: { companyId_code: { companyId: company.id, code: 'color' } },
    create: {
      companyId: company.id,
      code: 'color',
      nameVi: 'Màu',
      nameZh: '颜色',
      dataType: 'SELECT',
      optionsJson: ['Đỏ', 'Xanh', 'Đen', 'Trắng'],
      sortOrder: 1,
    },
    update: {},
  });
  await prisma.productAttribute.upsert({
    where: { companyId_code: { companyId: company.id, code: 'size' } },
    create: {
      companyId: company.id,
      code: 'size',
      nameVi: 'Kích thước',
      nameZh: '尺寸',
      dataType: 'SELECT',
      optionsJson: ['S', 'M', 'L', 'XL'],
      sortOrder: 2,
    },
    update: {},
  });

  const p1 = await prisma.product.upsert({
    where: { companyId_sku: { companyId: company.id, sku: 'SP001' } },
    create: {
      companyId: company.id,
      sku: 'SP001',
      nameVi: 'Áo thun basic',
      nameZh: '基础T恤',
      unit: 'Cái',
      salePrice: 150000,
      costPrice: 80000,
      minStock: 10,
    },
    update: {},
  });
  await prisma.productAttributeValue.upsert({
    where: {
      productId_attributeId: { productId: p1.id, attributeId: colorAttr.id },
    },
    create: {
      productId: p1.id,
      attributeId: colorAttr.id,
      valueText: 'Đen',
    },
    update: { valueText: 'Đen' },
  });

  await prisma.product.upsert({
    where: { companyId_sku: { companyId: company.id, sku: 'SP002' } },
    create: {
      companyId: company.id,
      sku: 'SP002',
      nameVi: 'Quần jean',
      nameZh: '牛仔裤',
      unit: 'Cái',
      salePrice: 350000,
      costPrice: 200000,
      minStock: 5,
    },
    update: {},
  });

  await prisma.stockBalance.upsert({
    where: {
      warehouseId_productId: { warehouseId: wh.id, productId: p1.id },
    },
    create: {
      companyId: company.id,
      warehouseId: wh.id,
      productId: p1.id,
      qty: 100,
    },
    update: { qty: 100 },
  });

  console.log('Seed OK');
  console.log(`Admin: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
