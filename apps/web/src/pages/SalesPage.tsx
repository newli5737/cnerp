import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

export function SalesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api<any[]>('/sales-orders'),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api<any[]>('/partners?type=CUSTOMER'),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api<any[]>('/warehouses'),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api<any[]>('/products'),
  });

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
    },
    onError: (e: Error) => message.error(e.message),
  });

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
              form.setFieldsValue({ orderDate: dayjs(), lines: [{ qty: 1, unitPrice: 0 }] });
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
        columns={[
          { title: t('code'), dataIndex: 'code' },
          {
            title: zh ? '客户' : 'Khách',
            render: (_, r) => (zh ? r.partner?.nameZh || r.partner?.nameVi : r.partner?.nameVi),
          },
          { title: t('date'), render: (_, r) => String(r.orderDate).slice(0, 10) },
          {
            title: t('status'),
            render: (_, r) => <Tag>{r.status}</Tag>,
          },
          {
            title: t('amount'),
            render: (_, r) => Number(r.totalAmount).toLocaleString(),
          },
          hasPermission('sales.write')
            ? {
                title: t('actions'),
                render: (_, r) => (
                  <Space>
                    {r.status === 'DRAFT' && (
                      <Button size="small" onClick={() => action.mutate({ id: r.id, act: 'confirm' })}>
                        {t('confirm')}
                      </Button>
                    )}
                    {(r.status === 'DRAFT' || r.status === 'CONFIRMED') && (
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => action.mutate({ id: r.id, act: 'deliver' })}
                      >
                        {zh ? '发货' : 'Giao hàng'}
                      </Button>
                    )}
                    {r.status !== 'DELIVERED' && r.status !== 'CANCELLED' && (
                      <Button size="small" danger onClick={() => action.mutate({ id: r.id, act: 'cancel' })}>
                        {t('cancel')}
                      </Button>
                    )}
                  </Space>
                ),
              }
            : {},
        ]}
      />
      <FormDrawer
        open={open}
        title={t('create')}
        width={680}
        onClose={() => setOpen(false)}
        loading={create.isPending}
        onSubmit={() =>
          form.validateFields().then((v) =>
            create.mutate({ ...v, orderDate: v.orderDate.format('YYYY-MM-DD') }),
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="partnerId" label={zh ? '客户' : 'Khách hàng'} rules={[{ required: true }]}>
            <Select
              options={partners.map((p: any) => ({
                value: p.id,
                label: `${p.code} — ${zh ? p.nameZh || p.nameVi : p.nameVi}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="warehouseId" label={t('menu.warehouses')} rules={[{ required: true }]}>
            <Select
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
            <Input />
          </Form.Item>
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item {...field} name={[field.name, 'productId']} rules={[{ required: true }]}>
                      <Select
                        style={{ width: 240 }}
                        options={products.map((p: any) => ({
                          value: p.id,
                          label: `${p.sku}`,
                        }))}
                        onChange={(id) => {
                          const p = products.find((x: any) => x.id === id);
                          if (p) {
                            const lines = form.getFieldValue('lines');
                            lines[field.name].unitPrice = Number(p.salePrice);
                            form.setFieldsValue({ lines });
                          }
                        }}
                      />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'qty']} rules={[{ required: true }]}>
                      <InputNumber min={0.0001} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'unitPrice']} rules={[{ required: true }]}>
                      <InputNumber min={0} />
                    </Form.Item>
                    <Button danger type="link" onClick={() => remove(field.name)}>
                      X
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" block onClick={() => add({ qty: 1, unitPrice: 0 })}>
                  + Line
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </FormDrawer>
    </div>
  );
}
