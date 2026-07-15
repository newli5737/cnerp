import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS } from '@cnerp/shared';

const prisma = new PrismaClient();
const D = (n: number) => new Prisma.Decimal(n);

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

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function lineVat(qty: number, price: number, vatRate: number) {
  const lineAmount = qty * price;
  const vatAmount = Math.round((lineAmount * vatRate) / 100);
  return {
    lineAmount,
    vatAmount,
    lineTotal: lineAmount + vatAmount,
    vatRate,
  };
}

async function wipeTransactions(companyId: string) {
  await prisma.invoicePayment.deleteMany({ where: { companyId } });
  await prisma.invoice.deleteMany({ where: { companyId } });
  await prisma.cashVoucher.deleteMany({ where: { companyId } });
  await prisma.bankVoucher.deleteMany({ where: { companyId } });
  await prisma.salesOrderLine.deleteMany({ where: { salesOrder: { companyId } } });
  await prisma.salesOrder.deleteMany({ where: { companyId } });
  await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { companyId } } });
  await prisma.purchaseOrder.deleteMany({ where: { companyId } });
  await prisma.stockMoveLine.deleteMany({ where: { stockMove: { companyId } } });
  await prisma.stockMove.deleteMany({ where: { companyId } });
  await prisma.stockBalance.deleteMany({ where: { companyId } });
  await prisma.productAttributeValue.deleteMany({
    where: { product: { companyId } },
  });
  await prisma.documentSequence.deleteMany({ where: { companyId } });
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@cnerp.local';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
  const year = new Date().getFullYear();

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
    update: {
      nameVi: 'CNERP Demo',
      nameZh: '中越商贸演示公司',
    },
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
  const salesRole = await upsertRole('sales', 'Bán hàng', '销售', [
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
  const whRole = await upsertRole('warehouse', 'Kho', '仓管', [
    'dashboard.read',
    'products.read',
    'warehouses.read',
    'inventory.read',
    'inventory.write',
    'purchase.read',
    'purchase.write',
  ]);
  const accRole = await upsertRole('accountant', 'Công nợ', '财务', [
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

  async function upsertUser(
    userEmail: string,
    fullName: string,
    pwd: string,
    roleId: string,
  ) {
    const hash = await bcrypt.hash(pwd, 10);
    const user = await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: userEmail } },
      create: {
        companyId: company.id,
        email: userEmail,
        fullName,
        passwordHash: hash,
      },
      update: { fullName, passwordHash: hash, isActive: true },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId } });
    return user;
  }

  await upsertUser(email, 'System Admin', password, adminRole.id);
  await upsertUser('sales@cnerp.local', 'Nguyễn Thị Mai', 'Sales@123', salesRole.id);
  await upsertUser('kho@cnerp.local', 'Trần Văn Kho', 'Kho@123', whRole.id);
  await upsertUser('ketoan@cnerp.local', 'Lê Thị Hoa', 'KeToan@123', accRole.id);

  // Wipe transactional demo so re-seed is clean & full
  await wipeTransactions(company.id);

  const wh1 = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH01' } },
    create: {
      companyId: company.id,
      code: 'WH01',
      nameVi: 'Kho chính Hà Nội',
      nameZh: '河内主仓库',
    },
    update: { nameVi: 'Kho chính Hà Nội', nameZh: '河内主仓库', isActive: true },
  });
  const wh2 = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'WH02' } },
    create: {
      companyId: company.id,
      code: 'WH02',
      nameVi: 'Kho phụ Bình Dương',
      nameZh: '平阳分仓',
    },
    update: { nameVi: 'Kho phụ Bình Dương', nameZh: '平阳分仓', isActive: true },
  });

  const partnerDefs = [
    {
      code: 'KH001',
      nameVi: 'Công ty TNHH ABC Trading',
      nameZh: 'ABC贸易有限公司',
      type: 'CUSTOMER',
      phone: '0901234567',
      email: 'mua@abc.vn',
      address: '12 Nguyễn Huệ, Q1, TP.HCM',
    },
    {
      code: 'KH002',
      nameVi: 'Siêu thị Minh Phát',
      nameZh: '明发超市',
      type: 'CUSTOMER',
      phone: '0912345678',
      email: 'order@minhphat.vn',
      address: '88 Láng Hạ, Hà Nội',
    },
    {
      code: 'KH003',
      nameVi: 'Cửa hàng thời trang Lan Anh',
      nameZh: '兰英时装店',
      type: 'CUSTOMER',
      phone: '0987654321',
      address: '45 Trần Phú, Đà Nẵng',
    },
    {
      code: 'NCC001',
      nameVi: 'Guangzhou Textile Co.',
      nameZh: '广州纺织有限公司',
      type: 'SUPPLIER',
      phone: '+86-20-88886666',
      email: 'sales@gztextile.cn',
      address: 'Baiyun District, Guangzhou',
    },
    {
      code: 'NCC002',
      nameVi: 'Shenzhen Electronics Ltd',
      nameZh: '深圳电子有限公司',
      type: 'SUPPLIER',
      phone: '+86-755-26668888',
      address: 'Nanshan, Shenzhen',
    },
    {
      code: 'DT001',
      nameVi: 'Đối tác Đông Á',
      nameZh: '东亚合作伙伴',
      type: 'BOTH',
      phone: '0909888777',
      address: 'Lào Cai border gate',
    },
  ] as const;

  const partners: Record<string, { id: string }> = {};
  for (const p of partnerDefs) {
    partners[p.code] = await prisma.partner.upsert({
      where: { companyId_code: { companyId: company.id, code: p.code } },
      create: { companyId: company.id, ...p, isActive: true },
      update: { ...p, isActive: true },
    });
  }

  const colorAttr = await prisma.productAttribute.upsert({
    where: { companyId_code: { companyId: company.id, code: 'color' } },
    create: {
      companyId: company.id,
      code: 'color',
      nameVi: 'Màu',
      nameZh: '颜色',
      dataType: 'SELECT',
      optionsJson: ['Đỏ', 'Xanh', 'Đen', 'Trắng', 'Be'],
      sortOrder: 1,
    },
    update: {},
  });
  const sizeAttr = await prisma.productAttribute.upsert({
    where: { companyId_code: { companyId: company.id, code: 'size' } },
    create: {
      companyId: company.id,
      code: 'size',
      nameVi: 'Kích thước',
      nameZh: '尺寸',
      dataType: 'SELECT',
      optionsJson: ['S', 'M', 'L', 'XL', 'XXL'],
      sortOrder: 2,
    },
    update: {},
  });
  const brandAttr = await prisma.productAttribute.upsert({
    where: { companyId_code: { companyId: company.id, code: 'brand' } },
    create: {
      companyId: company.id,
      code: 'brand',
      nameVi: 'Thương hiệu',
      nameZh: '品牌',
      dataType: 'TEXT',
      sortOrder: 3,
    },
    update: {},
  });

  const productDefs = [
    {
      sku: 'SP001',
      nameVi: 'Áo thun basic Nam',
      nameZh: '男款基础T恤',
      unit: 'Cái',
      salePrice: 150000,
      costPrice: 80000,
      vatRate: 10,
      minStock: 20,
      attrs: [
        { attr: colorAttr.id, text: 'Đen' },
        { attr: sizeAttr.id, text: 'L' },
        { attr: brandAttr.id, text: 'CNERP Wear' },
      ],
    },
    {
      sku: 'SP002',
      nameVi: 'Quần jean slim',
      nameZh: '修身牛仔裤',
      unit: 'Cái',
      salePrice: 350000,
      costPrice: 200000,
      vatRate: 10,
      minStock: 15,
      attrs: [
        { attr: colorAttr.id, text: 'Xanh' },
        { attr: sizeAttr.id, text: 'M' },
      ],
    },
    {
      sku: 'SP003',
      nameVi: 'Áo khoác gió Unisex',
      nameZh: '中性防风外套',
      unit: 'Cái',
      salePrice: 420000,
      costPrice: 250000,
      vatRate: 10,
      minStock: 10,
      attrs: [{ attr: colorAttr.id, text: 'Be' }],
    },
    {
      sku: 'SP004',
      nameVi: 'Giày sneaker trắng',
      nameZh: '白色运动鞋',
      unit: 'Đôi',
      salePrice: 550000,
      costPrice: 320000,
      vatRate: 10,
      minStock: 8,
      attrs: [{ attr: sizeAttr.id, text: 'XL' }],
    },
    {
      sku: 'SP005',
      nameVi: 'Túi canvas thời trang',
      nameZh: '时尚帆布包',
      unit: 'Cái',
      salePrice: 180000,
      costPrice: 95000,
      vatRate: 8,
      minStock: 12,
      attrs: [{ attr: colorAttr.id, text: 'Trắng' }],
    },
    {
      sku: 'SP006',
      nameVi: 'Tai nghe Bluetooth TWS',
      nameZh: '蓝牙无线耳机',
      unit: 'Bộ',
      salePrice: 290000,
      costPrice: 160000,
      vatRate: 10,
      minStock: 25,
      attrs: [{ attr: brandAttr.id, text: 'DosuAudio' }],
    },
    {
      sku: 'SP007',
      nameVi: 'Sạc dự phòng 10000mAh',
      nameZh: '10000毫安充电宝',
      unit: 'Cái',
      salePrice: 220000,
      costPrice: 120000,
      vatRate: 10,
      minStock: 30,
      attrs: [],
    },
    {
      sku: 'SP008',
      nameVi: 'Tất cotton set 5 đôi',
      nameZh: '棉袜5双装',
      unit: 'Set',
      salePrice: 75000,
      costPrice: 35000,
      vatRate: 8,
      minStock: 40,
      attrs: [{ attr: colorAttr.id, text: 'Đen' }],
    },
  ];

  const products: Record<string, { id: string; salePrice: number; costPrice: number; vatRate: number }> =
    {};

  for (const p of productDefs) {
    const row = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: p.sku } },
      create: {
        companyId: company.id,
        sku: p.sku,
        nameVi: p.nameVi,
        nameZh: p.nameZh,
        unit: p.unit,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        vatRate: p.vatRate,
        minStock: p.minStock,
        isActive: true,
      },
      update: {
        nameVi: p.nameVi,
        nameZh: p.nameZh,
        unit: p.unit,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        vatRate: p.vatRate,
        minStock: p.minStock,
        isActive: true,
      },
    });
    products[p.sku] = {
      id: row.id,
      salePrice: p.salePrice,
      costPrice: p.costPrice,
      vatRate: p.vatRate,
    };
    for (const a of p.attrs) {
      await prisma.productAttributeValue.create({
        data: {
          productId: row.id,
          attributeId: a.attr,
          valueText: a.text,
        },
      });
    }
  }

  // Opening stock receipt
  const openingLines = [
    { sku: 'SP001', qty: 200, wh: wh1 },
    { sku: 'SP002', qty: 120, wh: wh1 },
    { sku: 'SP003', qty: 80, wh: wh1 },
    { sku: 'SP004', qty: 60, wh: wh1 },
    { sku: 'SP005', qty: 150, wh: wh1 },
    { sku: 'SP006', qty: 100, wh: wh1 },
    { sku: 'SP007', qty: 90, wh: wh1 },
    { sku: 'SP008', qty: 300, wh: wh1 },
    { sku: 'SP001', qty: 50, wh: wh2 },
    { sku: 'SP006', qty: 40, wh: wh2 },
    { sku: 'SP007', qty: 35, wh: wh2 },
  ];

  const openMove = await prisma.stockMove.create({
    data: {
      companyId: company.id,
      warehouseId: wh1.id,
      moveType: 'IN',
      code: `ST${year}00001`,
      moveDate: daysAgo(20),
      status: 'POSTED',
      note: 'Tồn đầu kỳ / 期初库存',
      referenceType: 'OPENING',
      lines: {
        create: openingLines
          .filter((l) => l.wh.id === wh1.id)
          .map((l, i) => ({
            productId: products[l.sku].id,
            qty: l.qty,
            unitCost: products[l.sku].costPrice,
            lineNo: i + 1,
          })),
      },
    },
  });
  void openMove;

  const openMove2 = await prisma.stockMove.create({
    data: {
      companyId: company.id,
      warehouseId: wh2.id,
      moveType: 'IN',
      code: `ST${year}00002`,
      moveDate: daysAgo(20),
      status: 'POSTED',
      note: 'Tồn đầu kỳ kho phụ',
      referenceType: 'OPENING',
      lines: {
        create: openingLines
          .filter((l) => l.wh.id === wh2.id)
          .map((l, i) => ({
            productId: products[l.sku].id,
            qty: l.qty,
            unitCost: products[l.sku].costPrice,
            lineNo: i + 1,
          })),
      },
    },
  });
  void openMove2;

  for (const l of openingLines) {
    await prisma.stockBalance.create({
      data: {
        companyId: company.id,
        warehouseId: l.wh.id,
        productId: products[l.sku].id,
        qty: l.qty,
      },
    });
  }

  // Purchase RECEIVED from NCC001
  const po1Lines = [
    { sku: 'SP001', qty: 100 },
    { sku: 'SP002', qty: 50 },
    { sku: 'SP008', qty: 80 },
  ];
  let po1Total = 0;
  const po1LineCreate = po1Lines.map((l, i) => {
    const cost = products[l.sku].costPrice;
    const lineAmount = l.qty * cost;
    po1Total += lineAmount;
    return {
      productId: products[l.sku].id,
      qty: l.qty,
      unitCost: cost,
      lineAmount,
      lineNo: i + 1,
    };
  });

  const po1 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id,
      code: `PO${year}00001`,
      partnerId: partners.NCC001.id,
      warehouseId: wh1.id,
      orderDate: daysAgo(15),
      status: 'RECEIVED',
      totalAmount: po1Total,
      note: 'Nhập hàng vải/may mặc tháng 7',
      lines: { create: po1LineCreate },
    },
  });

  await prisma.stockMove.create({
    data: {
      companyId: company.id,
      warehouseId: wh1.id,
      moveType: 'IN',
      code: `ST${year}00003`,
      moveDate: daysAgo(14),
      status: 'POSTED',
      referenceType: 'PURCHASE_ORDER',
      referenceId: po1.id,
      note: `Nhập từ ${po1.code}`,
      lines: {
        create: po1Lines.map((l, i) => ({
          productId: products[l.sku].id,
          qty: l.qty,
          unitCost: products[l.sku].costPrice,
          lineNo: i + 1,
        })),
      },
    },
  });
  for (const l of po1Lines) {
    await prisma.stockBalance.update({
      where: {
        warehouseId_productId: { warehouseId: wh1.id, productId: products[l.sku].id },
      },
      data: { qty: { increment: l.qty } },
    });
  }

  const ap1 = await prisma.invoice.create({
    data: {
      companyId: company.id,
      partnerId: partners.NCC001.id,
      type: 'AP_INVOICE',
      code: `AP${year}00001`,
      invoiceDate: daysAgo(14),
      dueDate: daysAgo(-16),
      totalAmount: po1Total,
      paidAmount: 0,
      status: 'POSTED',
      purchaseOrderId: po1.id,
    },
  });

  // Partial pay AP
  const payApAmt = Math.round(po1Total * 0.4);
  const bankPay1 = await prisma.bankVoucher.create({
    data: {
      companyId: company.id,
      code: `NH${year}00001`,
      type: 'PAYMENT',
      voucherDate: daysAgo(7),
      partnerId: partners.NCC001.id,
      amount: payApAmt,
      note: `Thanh toán một phần ${ap1.code}`,
    },
  });
  await prisma.invoicePayment.create({
    data: {
      companyId: company.id,
      invoiceId: ap1.id,
      bankVoucherId: bankPay1.id,
      amount: payApAmt,
    },
  });
  await prisma.invoice.update({
    where: { id: ap1.id },
    data: { paidAmount: payApAmt, status: 'PARTIAL' },
  });

  // PO draft + confirmed (electronics)
  const po2Lines = [
    { sku: 'SP006', qty: 60 },
    { sku: 'SP007', qty: 40 },
  ];
  let po2Total = 0;
  const po2 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id,
      code: `PO${year}00002`,
      partnerId: partners.NCC002.id,
      warehouseId: wh1.id,
      orderDate: daysAgo(3),
      status: 'CONFIRMED',
      totalAmount: 0,
      note: 'Đơn điện tử chờ nhận hàng',
      lines: {
        create: po2Lines.map((l, i) => {
          const cost = products[l.sku].costPrice;
          const lineAmount = l.qty * cost;
          po2Total += lineAmount;
          return {
            productId: products[l.sku].id,
            qty: l.qty,
            unitCost: cost,
            lineAmount,
            lineNo: i + 1,
          };
        }),
      },
    },
  });
  await prisma.purchaseOrder.update({
    where: { id: po2.id },
    data: { totalAmount: po2Total },
  });

  await prisma.purchaseOrder.create({
    data: {
      companyId: company.id,
      code: `PO${year}00003`,
      partnerId: partners.DT001.id,
      warehouseId: wh2.id,
      orderDate: daysAgo(1),
      status: 'DRAFT',
      totalAmount: 20 * products.SP005.costPrice,
      note: 'Nháp mua túi canvas',
      lines: {
        create: [
          {
            productId: products.SP005.id,
            qty: 20,
            unitCost: products.SP005.costPrice,
            lineAmount: 20 * products.SP005.costPrice,
            lineNo: 1,
          },
        ],
      },
    },
  });

  let stockSeq = 10;
  let cashSeq = 1;
  let bankRecvSeq = 1;

  // Helper create delivered sales
  async function createDeliveredSale(opts: {
    code: string;
    partnerCode: string;
    warehouseId: string;
    days: number;
    lines: { sku: string; qty: number }[];
    payRatio?: number;
    payChannel?: 'cash' | 'bank';
    note?: string;
  }) {
    let subtotal = 0;
    let vatTotal = 0;
    const lineRows = opts.lines.map((l, i) => {
      const p = products[l.sku];
      const calc = lineVat(l.qty, p.salePrice, p.vatRate);
      subtotal += calc.lineAmount;
      vatTotal += calc.vatAmount;
      return {
        productId: p.id,
        qty: l.qty,
        unitPrice: p.salePrice,
        vatRate: calc.vatRate,
        vatAmount: calc.vatAmount,
        lineAmount: calc.lineAmount,
        lineTotal: calc.lineTotal,
        lineNo: i + 1,
      };
    });
    const total = subtotal + vatTotal;

    const so = await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        code: opts.code,
        partnerId: partners[opts.partnerCode].id,
        warehouseId: opts.warehouseId,
        orderDate: daysAgo(opts.days),
        status: 'DELIVERED',
        subtotalAmount: subtotal,
        vatAmount: vatTotal,
        totalAmount: total,
        note: opts.note,
        lines: { create: lineRows },
      },
    });

    stockSeq += 1;
    await prisma.stockMove.create({
      data: {
        companyId: company.id,
        warehouseId: opts.warehouseId,
        moveType: 'OUT',
        code: `ST${year}${String(stockSeq).padStart(5, '0')}`,
        moveDate: daysAgo(opts.days),
        status: 'POSTED',
        referenceType: 'SALES_ORDER',
        referenceId: so.id,
        note: `Xuất ${so.code}`,
        lines: {
          create: opts.lines.map((l, i) => ({
            productId: products[l.sku].id,
            qty: l.qty,
            unitCost: products[l.sku].costPrice,
            lineNo: i + 1,
          })),
        },
      },
    });

    for (const l of opts.lines) {
      await prisma.stockBalance.update({
        where: {
          warehouseId_productId: {
            warehouseId: opts.warehouseId,
            productId: products[l.sku].id,
          },
        },
        data: { qty: { decrement: l.qty } },
      });
    }

    const soNum = opts.code.replace(/\D/g, '').slice(-5);
    const inv = await prisma.invoice.create({
      data: {
        companyId: company.id,
        partnerId: partners[opts.partnerCode].id,
        type: 'AR_INVOICE',
        code: `AR${year}${soNum}`,
        invoiceDate: daysAgo(opts.days),
        dueDate: daysAgo(opts.days - 30),
        totalAmount: total,
        paidAmount: 0,
        status: 'POSTED',
        salesOrderId: so.id,
      },
    });

    if (opts.payRatio && opts.payRatio > 0) {
      const paid = Math.round(total * Math.min(opts.payRatio, 1));
      if (opts.payChannel === 'cash') {
        cashSeq += 1;
        const voucher = await prisma.cashVoucher.create({
          data: {
            companyId: company.id,
            code: `PT${year}${String(cashSeq).padStart(5, '0')}`,
            type: 'RECEIPT',
            voucherDate: daysAgo(Math.max(opts.days - 2, 0)),
            partnerId: partners[opts.partnerCode].id,
            amount: paid,
            note: `Thu ${inv.code}`,
          },
        });
        await prisma.invoicePayment.create({
          data: {
            companyId: company.id,
            invoiceId: inv.id,
            cashVoucherId: voucher.id,
            amount: paid,
          },
        });
      } else {
        bankRecvSeq += 1;
        const voucher = await prisma.bankVoucher.create({
          data: {
            companyId: company.id,
            code: `NT${year}${String(bankRecvSeq).padStart(5, '0')}`,
            type: 'RECEIPT',
            voucherDate: daysAgo(Math.max(opts.days - 2, 0)),
            partnerId: partners[opts.partnerCode].id,
            amount: paid,
            note: `Thu CK ${inv.code}`,
          },
        });
        await prisma.invoicePayment.create({
          data: {
            companyId: company.id,
            invoiceId: inv.id,
            bankVoucherId: voucher.id,
            amount: paid,
          },
        });
      }
      await prisma.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: paid,
          status: paid >= total ? 'PAID' : 'PARTIAL',
        },
      });
    }

    return so;
  }

  await createDeliveredSale({
    code: `SO${year}00001`,
    partnerCode: 'KH001',
    warehouseId: wh1.id,
    days: 12,
    lines: [
      { sku: 'SP001', qty: 30 },
      { sku: 'SP002', qty: 10 },
    ],
    payRatio: 0.4,
    payChannel: 'bank',
    note: 'Đơn ABC đã giao + thu một phần',
  });

  await createDeliveredSale({
    code: `SO${year}00002`,
    partnerCode: 'KH002',
    warehouseId: wh1.id,
    days: 8,
    lines: [
      { sku: 'SP005', qty: 40 },
      { sku: 'SP008', qty: 50 },
      { sku: 'SP006', qty: 15 },
    ],
    payRatio: 1,
    payChannel: 'cash',
    note: 'Minh Phát — đã thu đủ',
  });

  await createDeliveredSale({
    code: `SO${year}00003`,
    partnerCode: 'KH003',
    warehouseId: wh1.id,
    days: 5,
    lines: [
      { sku: 'SP003', qty: 8 },
      { sku: 'SP004', qty: 6 },
    ],
    note: 'Lan Anh — chưa thu',
  });

  await createDeliveredSale({
    code: `SO${year}00004`,
    partnerCode: 'DT001',
    warehouseId: wh2.id,
    days: 4,
    lines: [
      { sku: 'SP001', qty: 20 },
      { sku: 'SP007', qty: 10 },
    ],
    payRatio: 0.5,
    payChannel: 'bank',
    note: 'Xuất kho phụ Đông Á',
  });

  // Confirmed waiting deliver
  {
    const lines = [
      { sku: 'SP001', qty: 15 },
      { sku: 'SP006', qty: 10 },
    ];
    let subtotal = 0;
    let vatTotal = 0;
    const lineRows = lines.map((l, i) => {
      const p = products[l.sku];
      const calc = lineVat(l.qty, p.salePrice, p.vatRate);
      subtotal += calc.lineAmount;
      vatTotal += calc.vatAmount;
      return {
        productId: p.id,
        qty: l.qty,
        unitPrice: p.salePrice,
        vatRate: calc.vatRate,
        vatAmount: calc.vatAmount,
        lineAmount: calc.lineAmount,
        lineTotal: calc.lineTotal,
        lineNo: i + 1,
      };
    });
    await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        code: `SO${year}00005`,
        partnerId: partners.KH001.id,
        warehouseId: wh1.id,
        orderDate: daysAgo(1),
        status: 'CONFIRMED',
        subtotalAmount: subtotal,
        vatAmount: vatTotal,
        totalAmount: subtotal + vatTotal,
        note: 'Đã xác nhận — chờ giao (đủ tồn)',
        lines: { create: lineRows },
      },
    });
  }

  // Draft
  {
    const calc = lineVat(5, products.SP004.salePrice, products.SP004.vatRate);
    await prisma.salesOrder.create({
      data: {
        companyId: company.id,
        code: `SO${year}00006`,
        partnerId: partners.KH002.id,
        warehouseId: wh1.id,
        orderDate: daysAgo(0),
        status: 'DRAFT',
        subtotalAmount: calc.lineAmount,
        vatAmount: calc.vatAmount,
        totalAmount: calc.lineTotal,
        note: 'Nháp bán giày',
        lines: {
          create: [
            {
              productId: products.SP004.id,
              qty: 5,
              unitPrice: products.SP004.salePrice,
              vatRate: calc.vatRate,
              vatAmount: calc.vatAmount,
              lineAmount: calc.lineAmount,
              lineTotal: calc.lineTotal,
              lineNo: 1,
            },
          ],
        },
      },
    });
  }

  // Misc cash expense
  await prisma.cashVoucher.create({
    data: {
      companyId: company.id,
      code: `PC${year}00001`,
      type: 'PAYMENT',
      voucherDate: daysAgo(6),
      amount: 500000,
      note: 'Chi phí vận chuyển nội địa',
    },
  });

  // Sequences so next numbers won't collide
  const seqs: { docType: string; last: number }[] = [
    { docType: 'SO', last: 6 },
    { docType: 'PO', last: 3 },
    { docType: 'STOCK', last: 20 },
    { docType: 'AR', last: 10 },
    { docType: 'AP', last: 5 },
    { docType: 'CASH', last: 10 },
    { docType: 'BANK', last: 10 },
    { docType: 'SKU', last: 8 },
    { docType: 'WH', last: 2 },
    { docType: 'PARTNER_KH', last: 3 },
    { docType: 'PARTNER_NCC', last: 2 },
  ];
  for (const s of seqs) {
    await prisma.documentSequence.create({
      data: {
        companyId: company.id,
        docType: s.docType,
        year,
        lastNumber: s.last,
      },
    });
  }

  const balances = await prisma.stockBalance.findMany({
    where: { companyId: company.id },
    include: { product: true, warehouse: true },
  });

  console.log('========== SEED DEMO OK ==========');
  console.log(`Company: ${company.code}`);
  console.log('Users:');
  console.log(`  ${email} / ${password} (admin)`);
  console.log('  sales@cnerp.local / Sales@123');
  console.log('  kho@cnerp.local / Kho@123');
  console.log('  ketoan@cnerp.local / KeToan@123');
  console.log(`Partners: ${partnerDefs.length} | Products: ${productDefs.length}`);
  console.log(`Warehouses: WH01, WH02`);
  console.log('Stock sample:');
  for (const b of balances.slice(0, 8)) {
    console.log(
      `  ${b.warehouse.code} ${b.product.sku} = ${b.qty}`,
    );
  }
  console.log('Sales: SO…001–004 DELIVERED, 005 CONFIRMED, 006 DRAFT');
  console.log('Purchase: PO…001 RECEIVED(+AP partial), 002 CONFIRMED, 003 DRAFT');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
