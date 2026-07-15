import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Row, Space, Table, Tabs, Typography } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';

function exportRows(name: string, rows: object[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'data');
  XLSX.writeFile(wb, `${name}.xlsx`);
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';

  const sales = useQuery({
    queryKey: ['rpt-sales'],
    queryFn: () => api<{ series: { date: string; amount: number }[]; total: number; count: number }>('/reports/sales-summary'),
  });
  const inventory = useQuery({
    queryKey: ['rpt-inv'],
    queryFn: () => api<any[]>('/reports/inventory-balance'),
  });
  const aging = useQuery({
    queryKey: ['rpt-aging'],
    queryFn: () => api<{ ar: any; ap: any }>('/reports/ar-ap-aging'),
  });
  const topProducts = useQuery({
    queryKey: ['rpt-top-p'],
    queryFn: () => api<any[]>('/reports/top-products'),
  });
  const topPartners = useQuery({
    queryKey: ['rpt-top-c'],
    queryFn: () => api<any[]>('/reports/top-partners'),
  });
  const cashflow = useQuery({
    queryKey: ['rpt-cf'],
    queryFn: () => api<{ receipt: number; payment: number; net: number }>('/reports/cashflow'),
  });

  return (
    <div>
      <Typography.Title level={3}>{t('menu.reports')}</Typography.Title>
      <Tabs
        items={[
          {
            key: 'sales',
            label: zh ? '销售统计' : 'Doanh số',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Row gutter={16}>
                  <Col span={8}>
                    <Card>
                      <Typography.Text type="secondary">{t('total')}</Typography.Text>
                      <Typography.Title level={3}>
                        {(sales.data?.total ?? 0).toLocaleString()} ₫
                      </Typography.Title>
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Typography.Text type="secondary">{zh ? '订单数' : 'Số đơn'}</Typography.Text>
                      <Typography.Title level={3}>{sales.data?.count ?? 0}</Typography.Title>
                    </Card>
                  </Col>
                </Row>
                <Card
                  title={zh ? '按日销售' : 'Doanh số theo ngày'}
                  extra={
                    <Button
                      onClick={() => exportRows('sales', sales.data?.series ?? [])}
                    >
                      {t('export')}
                    </Button>
                  }
                >
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={sales.data?.series ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="amount" stroke="#0f4c81" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Space>
            ),
          },
          {
            key: 'inventory',
            label: zh ? '库存' : 'Tồn kho',
            children: (
              <Card
                extra={
                  <Button onClick={() => exportRows('inventory', inventory.data ?? [])}>
                    {t('export')}
                  </Button>
                }
              >
                <Table
                  rowKey={(r) => `${r.warehouseCode}-${r.sku}`}
                  loading={inventory.isLoading}
                  dataSource={inventory.data ?? []}
                  columns={[
                    { title: 'WH', dataIndex: 'warehouseCode' },
                    { title: 'SKU', dataIndex: 'sku' },
                    {
                      title: t('name'),
                      render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
                    },
                    { title: t('qty'), dataIndex: 'qty' },
                    {
                      title: zh ? '金额' : 'Giá trị',
                      dataIndex: 'value',
                      render: (v) => Number(v).toLocaleString(),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'aging',
            label: zh ? '账龄' : 'Aging',
            children: (
              <Row gutter={16}>
                {(['ar', 'ap'] as const).map((k) => {
                  const row = aging.data?.[k];
                  const chart = row
                    ? [
                        { name: '0-30', value: row.d0_30 },
                        { name: '31-60', value: row.d31_60 },
                        { name: '61-90', value: row.d61_90 },
                        { name: '90+', value: row.d90_plus },
                      ]
                    : [];
                  return (
                    <Col span={12} key={k}>
                      <Card title={k.toUpperCase()}>
                        <Typography.Paragraph>
                          {t('total')}: {(row?.total ?? 0).toLocaleString()}
                        </Typography.Paragraph>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <BarChart data={chart}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="value" fill="#0f4c81" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            ),
          },
          {
            key: 'top',
            label: zh ? '排行' : 'Top',
            children: (
              <Row gutter={16}>
                <Col span={12}>
                  <Card title={zh ? '热销产品' : 'Top sản phẩm'}>
                    <Table
                      rowKey="sku"
                      size="small"
                      dataSource={topProducts.data ?? []}
                      pagination={false}
                      columns={[
                        { title: 'SKU', dataIndex: 'sku' },
                        {
                          title: t('name'),
                          render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
                        },
                        { title: t('amount'), dataIndex: 'amount', render: (v) => Number(v).toLocaleString() },
                      ]}
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title={zh ? '客户排行' : 'Top khách hàng'}>
                    <Table
                      rowKey="code"
                      size="small"
                      dataSource={topPartners.data ?? []}
                      pagination={false}
                      columns={[
                        { title: t('code'), dataIndex: 'code' },
                        {
                          title: t('name'),
                          render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
                        },
                        { title: t('amount'), dataIndex: 'amount', render: (v) => Number(v).toLocaleString() },
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            ),
          },
          {
            key: 'cash',
            label: zh ? '收支' : 'Thu chi',
            children: (
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Typography.Text type="secondary">{zh ? '收入' : 'Thu'}</Typography.Text>
                    <Typography.Title level={3}>
                      {(cashflow.data?.receipt ?? 0).toLocaleString()}
                    </Typography.Title>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Typography.Text type="secondary">{zh ? '支出' : 'Chi'}</Typography.Text>
                    <Typography.Title level={3}>
                      {(cashflow.data?.payment ?? 0).toLocaleString()}
                    </Typography.Title>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Typography.Text type="secondary">Net</Typography.Text>
                    <Typography.Title level={3}>
                      {(cashflow.data?.net ?? 0).toLocaleString()}
                    </Typography.Title>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}
