import { useQuery } from '@tanstack/react-query';
import { Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';

type Bal = {
  id: string;
  qty: string | number;
  product: { sku: string; nameVi: string; nameZh?: string | null; minStock: string | number };
  warehouse: { code: string; nameVi: string; nameZh?: string | null };
};

export function InventoryPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { data = [], isLoading } = useQuery({
    queryKey: ['balances'],
    queryFn: () => api<Bal[]>('/inventory/balances'),
  });

  return (
    <div>
      <Typography.Title level={3}>{t('menu.inventory')}</Typography.Title>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        columns={[
          {
            title: t('menu.warehouses'),
            render: (_, r) => `${r.warehouse.code} — ${zh ? r.warehouse.nameZh || r.warehouse.nameVi : r.warehouse.nameVi}`,
          },
          { title: 'SKU', render: (_, r) => r.product.sku },
          {
            title: t('name'),
            render: (_, r) => (zh ? r.product.nameZh || r.product.nameVi : r.product.nameVi),
          },
          { title: t('qty'), render: (_, r) => Number(r.qty) },
          { title: 'Min', render: (_, r) => Number(r.product.minStock) },
        ]}
      />
    </div>
  );
}
