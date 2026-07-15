import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';

type Summary = {
  salesMonthAmount: number;
  salesMonthCount: number;
  arDue: number;
  apDue: number;
  lowStockCount: number;
  lowStock: { sku: string; nameVi: string; nameZh?: string; qty: number; minStock: number; warehouse: string }[];
  recentOrders: { id: string; code: string; status: string; totalAmount: string; partner: { nameVi: string; nameZh?: string } }[];
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Summary>('/dashboard/summary'),
  });
  const zh = i18n.language === 'zh';

  return (
    <div>
      <Typography.Title level={3}>{t('menu.dashboard')}</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title={zh ? '本月销售额' : 'Doanh số tháng'} value={data?.salesMonthAmount ?? 0} suffix="₫" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title={zh ? '本月订单' : 'Đơn tháng'} value={data?.salesMonthCount ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title={zh ? '应收余额' : 'Phải thu'} value={data?.arDue ?? 0} suffix="₫" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={isLoading}>
            <Statistic title={zh ? '应付余额' : 'Phải trả'} value={data?.apDue ?? 0} suffix="₫" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={zh ? '低库存' : 'Tồn thấp'} loading={isLoading}>
            <Table
              size="small"
              rowKey="sku"
              pagination={false}
              dataSource={data?.lowStock ?? []}
              columns={[
                { title: 'SKU', dataIndex: 'sku' },
                {
                  title: t('name'),
                  render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
                },
                { title: t('qty'), dataIndex: 'qty' },
                { title: 'Min', dataIndex: 'minStock' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={zh ? '最近销售单' : 'Đơn bán gần đây'} loading={isLoading}>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={data?.recentOrders ?? []}
              columns={[
                { title: t('code'), dataIndex: 'code' },
                {
                  title: zh ? '客户' : 'Khách',
                  render: (_, r) => (zh ? r.partner.nameZh || r.partner.nameVi : r.partner.nameVi),
                },
                { title: t('status'), dataIndex: 'status' },
                {
                  title: t('amount'),
                  render: (_, r) => Number(r.totalAmount).toLocaleString(),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
