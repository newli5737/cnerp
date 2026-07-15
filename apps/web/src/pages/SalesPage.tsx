import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { api, type ApiError } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

function money(n: number) {
  return Number(n || 0).toLocaleString('vi-VN');
}

const statusColor: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'blue',
  DELIVERED: 'green',
  CANCELLED: 'red',
};

const VAT_OPTIONS = [
  { value: 0, label: '0%' },
  { value: 5, label: '5%' },
  { value: 8, label: '8%' },
  { value: 10, label: '10%' },
];

export function SalesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [form] = Form.useForm();
  const linesWatch = Form.useWatch('lines', form) || [];

  const showErr = (e: unknown) => {
    const err = e as ApiError;
    const text = err.i18nKey ? t(err.i18nKey) : err.message || t('errors.generic');
    Modal.error({
      title: t('errors.title'),
      content: text,
      okText: t('confirm'),
      centered: true,
    });
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api<any[]>('/sales-orders'),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['partners', 'CUSTOMER', 'active'],
    queryFn: () => api<any[]>('/partners?type=CUSTOMER&active=1'),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: () => api<any[]>('/warehouses?active=1'),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api<any[]>('/products?active=1'),
  });

  const totals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    for (const l of linesWatch as any[]) {
      const amt = Number(l?.qty || 0) * Number(l?.unitPrice || 0);
      const vatAmt = (amt * Number(l?.vatRate ?? 10)) / 100;
      subtotal += amt;
      vat += vatAmt;
    }
    return { subtotal, vat, total: subtotal + vat };
  }, [linesWatch]);

  const create = useMutation({
    mutationFn: (body: unknown) => api('/sales-orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: showErr,
  });

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) =>
      api(`/sales-orders/${id}/${act}`, { method: 'POST' }),
    onSuccess: async () => {
      message.success(t('success'));
      await qc.invalidateQueries({ queryKey: ['sales'] });
      await qc.invalidateQueries({ queryKey: ['balances'] });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: showErr,
  });

  const openPrint = async (id: string) => {
    try {
      const order = await api<any>(`/sales-orders/${id}`);
      setPrintOrder(order);
    } catch (e) {
      showErr(e);
    }
  };

  const doPrint = () => {
    const el = document.getElementById('sales-print-area');
    if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${printOrder?.code || ''}</title>
      <style>
        body{font-family:'Segoe UI','Microsoft YaHei',sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin:0 0 4px}
        .meta{color:#555;margin-bottom:16px;font-size:13px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ccc;padding:8px;font-size:13px}
        th{background:#f5f7fa;text-align:left}
        .right{text-align:right}
        .totals{margin-top:16px;width:280px;margin-left:auto}
        .totals td{border:none;padding:4px 8px}
        .totals .grand{font-weight:700;font-size:15px}
        @media print{button{display:none}}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 300);
  };

  const productName = (p: any) => (zh ? p.nameZh || p.nameVi : p.nameVi);

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.sales')}
        </Typography.Title>
        {hasPermission('sales.write') && (
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({
                orderDate: dayjs(),
                lines: [{ qty: 1, unitPrice: 0, vatRate: 10 }],
              });
              setOpen(true);
            }}
          >
            {t('create')}
          </Button>
        )}
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={r.lines || []}
              columns={[
                { title: 'SKU', render: (_: unknown, l: any) => l.product?.sku },
                {
                  title: t('product'),
                  render: (_: unknown, l: any) =>
                    zh ? l.product?.nameZh || l.product?.nameVi : l.product?.nameVi,
                },
                { title: t('qty'), dataIndex: 'qty', render: (v: any) => Number(v) },
                {
                  title: t('unitPrice'),
                  dataIndex: 'unitPrice',
                  render: (v: any) => money(Number(v)),
                },
                {
                  title: t('vat'),
                  render: (_: unknown, l: any) => `${Number(l.vatRate ?? 0)}%`,
                },
                {
                  title: t('vatAmount'),
                  render: (_: unknown, l: any) => money(Number(l.vatAmount ?? 0)),
                },
                {
                  title: t('lineTotal'),
                  render: (_: unknown, l: any) =>
                    money(Number(l.lineTotal ?? Number(l.lineAmount) + Number(l.vatAmount || 0))),
                },
              ]}
            />
          ),
        }}
        columns={[
          { title: t('code'), dataIndex: 'code', width: 140 },
          {
            title: t('customer'),
            render: (_, r) => (zh ? r.partner?.nameZh || r.partner?.nameVi : r.partner?.nameVi),
          },
          {
            title: t('warehouse'),
            render: (_, r) => r.warehouse?.code,
            width: 90,
          },
          {
            title: t('date'),
            render: (_, r) => String(r.orderDate).slice(0, 10),
            width: 110,
          },
          {
            title: t('status'),
            width: 120,
            render: (_, r) => (
              <Tag color={statusColor[r.status] || 'default'}>
                {t(`statusMap.${r.status}`, { defaultValue: r.status })}
              </Tag>
            ),
          },
          {
            title: t('subtotal'),
            align: 'right',
            render: (_, r) => money(Number(r.subtotalAmount ?? r.totalAmount)),
          },
          {
            title: t('vatAmount'),
            align: 'right',
            render: (_, r) => money(Number(r.vatAmount ?? 0)),
          },
          {
            title: t('total'),
            align: 'right',
            render: (_, r) => money(Number(r.totalAmount)),
          },
          {
            title: t('actions'),
            width: 300,
            render: (_, r) => (
              <Space wrap>
                <Button size="small" icon={<PrinterOutlined />} onClick={() => openPrint(r.id)}>
                  {t('print')}
                </Button>
                {hasPermission('sales.write') && r.status === 'DRAFT' && (
                  <Button size="small" onClick={() => action.mutate({ id: r.id, act: 'confirm' })}>
                    {t('confirm')}
                  </Button>
                )}
                {hasPermission('sales.write') && r.status === 'CONFIRMED' && (
                  <Popconfirm
                    title={t('confirmDeliver')}
                    onConfirm={() => action.mutate({ id: r.id, act: 'deliver' })}
                  >
                    <Button size="small" type="primary">
                      {t('deliver')}
                    </Button>
                  </Popconfirm>
                )}
                {hasPermission('sales.write') &&
                  r.status !== 'DELIVERED' &&
                  r.status !== 'CANCELLED' && (
                    <Popconfirm
                      title={t('confirmCancel')}
                      onConfirm={() => action.mutate({ id: r.id, act: 'cancel' })}
                    >
                      <Button size="small" danger>
                        {t('cancel')}
                      </Button>
                    </Popconfirm>
                  )}
              </Space>
            ),
          },
        ]}
      />

      <FormDrawer
        open={open}
        title={`${t('create')} — ${t('menu.sales')}`}
        width={900}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        onSubmit={() =>
          form.validateFields().then((v) => {
            const lines = (v.lines || []).filter((l: any) => l?.productId && Number(l.qty) > 0);
            if (!lines.length) {
              Modal.warning({
                title: t('errors.title'),
                content: zh ? '请至少添加一行产品' : 'Cần ít nhất một dòng sản phẩm',
                centered: true,
              });
              return;
            }
            create.mutate({
              partnerId: v.partnerId,
              warehouseId: v.warehouseId,
              orderDate: v.orderDate.format('YYYY-MM-DD'),
              note: v.note || null,
              lines: lines.map((l: any) => ({
                productId: l.productId,
                qty: Number(l.qty),
                unitPrice: Number(l.unitPrice),
                vatRate: Number(l.vatRate ?? 10),
              })),
            });
          })
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="partnerId" label={t('customer')} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={partners.map((p: any) => ({
                value: p.id,
                label: `${p.code} — ${zh ? p.nameZh || p.nameVi : p.nameVi}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="warehouseId" label={t('warehouse')} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={warehouses.map((w: any) => ({
                value: w.id,
                label: `${w.code} — ${zh ? w.nameZh || w.nameVi : w.nameVi}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="orderDate" label={t('date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
            {t('product')}
          </Typography.Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 90px 110px 80px 110px 40px',
              gap: 8,
              marginBottom: 8,
              color: '#666',
              fontSize: 12,
            }}
          >
            <span>{t('product')}</span>
            <span>{t('qty')}</span>
            <span>{t('unitPrice')}</span>
            <span>{t('vat')}</span>
            <span>{t('lineTotal')}</span>
            <span />
          </div>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => {
                  const line = linesWatch?.[field.name] || {};
                  const amt = Number(line.qty || 0) * Number(line.unitPrice || 0);
                  const vatAmt = (amt * Number(line.vatRate ?? 10)) / 100;
                  const lineTotal = amt + vatAmt;
                  return (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 90px 110px 80px 110px 40px',
                        gap: 8,
                        marginBottom: 8,
                        alignItems: 'start',
                      }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, 'productId']}
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          options={products.map((p: any) => ({
                            value: p.id,
                            label: `${p.sku} — ${productName(p)}`,
                          }))}
                          onChange={(id) => {
                            const p = products.find((x: any) => x.id === id);
                            if (!p) return;
                            const next = [...(form.getFieldValue('lines') || [])];
                            next[field.name] = {
                              ...next[field.name],
                              productId: id,
                              unitPrice: Number(p.salePrice),
                              vatRate: Number(p.vatRate ?? 10),
                            };
                            form.setFieldsValue({ lines: next });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'qty']}
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0.0001} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'unitPrice']}
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, 'vatRate']}
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select options={VAT_OPTIONS} />
                      </Form.Item>
                      <InputNumber disabled value={lineTotal} style={{ width: '100%' }} />
                      <Button
                        danger
                        type="text"
                        disabled={fields.length <= 1}
                        onClick={() => remove(field.name)}
                      >
                        X
                      </Button>
                    </div>
                  );
                })}
                <Button
                  type="dashed"
                  block
                  onClick={() => add({ qty: 1, unitPrice: 0, vatRate: 10 })}
                >
                  {t('addLine')}
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ marginTop: 16, textAlign: 'right', lineHeight: 1.8 }}>
            <div>
              {t('subtotal')}: <strong>{money(totals.subtotal)} ₫</strong>
            </div>
            <div>
              {t('vatAmount')}: <strong>{money(totals.vat)} ₫</strong>
            </div>
            <div style={{ fontSize: 16 }}>
              {t('total')}: <strong>{money(totals.total)} ₫</strong>
            </div>
          </div>
        </Form>
      </FormDrawer>

      <Modal
        open={!!printOrder}
        title={`${t('print')} — ${printOrder?.code || ''}`}
        onCancel={() => setPrintOrder(null)}
        width={820}
        footer={[
          <Button key="close" onClick={() => setPrintOrder(null)}>
            {t('cancel')}
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={doPrint}>
            {t('print')}
          </Button>,
        ]}
      >
        {printOrder && (
          <div id="sales-print-area">
            <h1>
              {zh ? '销售订单' : 'Đơn bán hàng'} — {printOrder.code}
            </h1>
            <div className="meta">
              <div>
                <strong>{zh ? '公司' : 'Công ty'}:</strong>{' '}
                {zh
                  ? user?.company.nameZh || user?.company.nameVi
                  : user?.company.nameVi}
              </div>
              <div>
                <strong>{t('customer')}:</strong>{' '}
                {zh
                  ? printOrder.partner?.nameZh || printOrder.partner?.nameVi
                  : printOrder.partner?.nameVi}{' '}
                ({printOrder.partner?.code})
              </div>
              <div>
                <strong>{t('warehouse')}:</strong> {printOrder.warehouse?.code} —{' '}
                {zh
                  ? printOrder.warehouse?.nameZh || printOrder.warehouse?.nameVi
                  : printOrder.warehouse?.nameVi}
              </div>
              <div>
                <strong>{t('date')}:</strong> {String(printOrder.orderDate).slice(0, 10)}
              </div>
              <div>
                <strong>{t('status')}:</strong>{' '}
                {t(`statusMap.${printOrder.status}`, { defaultValue: printOrder.status })}
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>{t('product')}</th>
                  <th className="right">{t('qty')}</th>
                  <th className="right">{t('unitPrice')}</th>
                  <th className="right">{t('vat')}</th>
                  <th className="right">{t('vatAmount')}</th>
                  <th className="right">{t('lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {(printOrder.lines || []).map((l: any, idx: number) => (
                  <tr key={l.id}>
                    <td>{idx + 1}</td>
                    <td>{l.product?.sku}</td>
                    <td>{zh ? l.product?.nameZh || l.product?.nameVi : l.product?.nameVi}</td>
                    <td className="right">{Number(l.qty)}</td>
                    <td className="right">{money(Number(l.unitPrice))}</td>
                    <td className="right">{Number(l.vatRate ?? 0)}%</td>
                    <td className="right">{money(Number(l.vatAmount ?? 0))}</td>
                    <td className="right">
                      {money(Number(l.lineTotal ?? Number(l.lineAmount) + Number(l.vatAmount || 0)))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="totals">
              <tbody>
                <tr>
                  <td>{t('subtotal')}</td>
                  <td className="right">
                    {money(Number(printOrder.subtotalAmount ?? printOrder.totalAmount))} ₫
                  </td>
                </tr>
                <tr>
                  <td>{t('vatAmount')}</td>
                  <td className="right">{money(Number(printOrder.vatAmount ?? 0))} ₫</td>
                </tr>
                <tr className="grand">
                  <td>{t('total')}</td>
                  <td className="right">{money(Number(printOrder.totalAmount))} ₫</td>
                </tr>
              </tbody>
            </table>
            {printOrder.note && (
              <p style={{ marginTop: 16 }}>
                <strong>{t('note')}:</strong> {printOrder.note}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
