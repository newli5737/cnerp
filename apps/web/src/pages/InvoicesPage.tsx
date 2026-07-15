import { useQuery } from '@tanstack/react-query';
import { Table, Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';

export function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<any[]>('/ar-ap/invoices'),
  });
  const { data: balances = [] } = useQuery({
    queryKey: ['partner-balances'],
    queryFn: () => api<any[]>('/ar-ap/partner-balances'),
  });

  const invTable = (type?: string) => (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={type ? invoices.filter((i) => i.type === type) : invoices}
      columns={[
        { title: t('code'), dataIndex: 'code' },
        { title: 'Type', dataIndex: 'type' },
        {
          title: zh ? '单位' : 'Đối tác',
          render: (_, r) => (zh ? r.partner?.nameZh || r.partner?.nameVi : r.partner?.nameVi),
        },
        { title: t('date'), render: (_, r) => String(r.invoiceDate).slice(0, 10) },
        { title: t('total'), render: (_, r) => Number(r.totalAmount).toLocaleString() },
        { title: zh ? '已付' : 'Đã trả', render: (_, r) => Number(r.paidAmount).toLocaleString() },
        { title: t('status'), dataIndex: 'status' },
      ]}
    />
  );

  return (
    <div>
      <Typography.Title level={3}>{t('menu.invoices')}</Typography.Title>
      <Tabs
        items={[
          { key: 'all', label: zh ? '全部' : 'Tất cả', children: invTable() },
          { key: 'ar', label: 'AR', children: invTable('AR_INVOICE') },
          { key: 'ap', label: 'AP', children: invTable('AP_INVOICE') },
          {
            key: 'bal',
            label: zh ? '余额' : 'Số dư',
            children: (
              <Table
                rowKey="partnerId"
                dataSource={balances}
                columns={[
                  {
                    title: t('name'),
                    render: (_, r) =>
                      zh ? r.partner?.nameZh || r.partner?.nameVi : r.partner?.nameVi,
                  },
                  { title: 'AR', dataIndex: 'ar', render: (v) => Number(v).toLocaleString() },
                  { title: 'AP', dataIndex: 'ap', render: (v) => Number(v).toLocaleString() },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
