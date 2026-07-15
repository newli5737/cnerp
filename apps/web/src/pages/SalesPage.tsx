import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
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

export function SalesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const linesWatch = Form.useWatch('lines', form) || [];

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

  const grandTotal = useMemo(
    () =>
      (linesWatch as any[]).reduce(
        (s, l) => s + Number(l?.qty || 0) * Number(l?.unitPrice || 0),
        0,
      ),
    [linesWatch],
  );

  const create = useMutation({
    mutationFn: (body: unknown) => api('/sales-orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (e: Error) => message.error(e.message),
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
    onError: (e: Error) => message.error(e.message),
  });

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
                lines: [{ qty: 1, unitPrice: 0 }],
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
                {
                  title: 'SKU',
                  render: (_: unknown, l: any) => l.product?.sku,
                },
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
                  title: t('lineTotal'),
                  dataIndex: 'lineAmount',
                  render: (v: any) => money(Number(v)),
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
            width: 100,
          },
          {
            title: t('date'),
            render: (_, r) => String(r.orderDate).slice(0, 10),
            width: 120,
          },
          {
            title: t('status'),
            width: 130,
            render: (_, r) => (
              <Tag color={statusColor[r.status] || 'default'}>
                {t(`statusMap.${r.status}`, { defaultValue: r.status })}
              </Tag>
            ),
          },
          {
            title: t('amount'),
            align: 'right',
            render: (_, r) => money(Number(r.totalAmount)),
          },
          hasPermission('sales.write')
            ? {
                title: t('actions'),
                width: 280,
                render: (_, r) => (
                  <Space wrap>
                    {r.status === 'DRAFT' && (
                      <Button size="small" onClick={() => action.mutate({ id: r.id, act: 'confirm' })}>
                        {t('confirm')}
                      </Button>
                    )}
                    {r.status === 'CONFIRMED' && (
                      <Popconfirm
                        title={t('confirmDeliver')}
                        onConfirm={() => action.mutate({ id: r.id, act: 'deliver' })}
                      >
                        <Button size="small" type="primary">
                          {t('deliver')}
                        </Button>
                      </Popconfirm>
                    )}
                    {r.status !== 'DELIVERED' && r.status !== 'CANCELLED' && (
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
              }
            : {},
        ]}
      />

      <FormDrawer
        open={open}
        title={`${t('create')} — ${t('menu.sales')}`}
        width={780}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        onSubmit={() =>
          form.validateFields().then((v) => {
            const lines = (v.lines || []).filter((l: any) => l?.productId && Number(l.qty) > 0);
            if (!lines.length) {
              message.error(zh ? '请至少添加一行产品' : 'Cần ít nhất một dòng sản phẩm');
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
              placeholder={t('customer')}
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
              gridTemplateColumns: '1fr 100px 120px 120px 40px',
              gap: 8,
              marginBottom: 8,
              color: '#666',
              fontSize: 12,
            }}
          >
            <span>{t('product')}</span>
            <span>{t('qty')}</span>
            <span>{t('unitPrice')}</span>
            <span>{t('lineTotal')}</span>
            <span />
          </div>

          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => {
                  const line = linesWatch?.[field.name] || {};
                  const lineAmt = Number(line.qty || 0) * Number(line.unitPrice || 0);
                  return (
                    <div
                      key={field.key}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 120px 120px 40px',
                        gap: 8,
                        marginBottom: 8,
                        alignItems: 'start',
                      }}
                    >
                      <Form.Item
                        {...field}
                        name={[field.name, 'productId']}
                        rules={[{ required: true, message: t('product') }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          optionFilterProp="label"
                          placeholder={t('product')}
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
                      <InputNumber
                        disabled
                        value={lineAmt}
                        style={{ width: '100%' }}
                        formatter={(v) => money(Number(v || 0))}
                      />
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
                <Button type="dashed" block onClick={() => add({ qty: 1, unitPrice: 0 })}>
                  {t('addLine')}
                </Button>
              </>
            )}
          </Form.List>

          <div style={{ textAlign: 'right', marginTop: 16, fontSize: 16 }}>
            <Typography.Text strong>
              {t('total')}: {money(grandTotal)} ₫
            </Typography.Text>
          </div>
        </Form>
      </FormDrawer>
    </div>
  );
}
