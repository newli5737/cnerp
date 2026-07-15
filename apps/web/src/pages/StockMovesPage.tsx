import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

export function StockMovesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['moves'],
    queryFn: () => api<any[]>('/inventory/moves'),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api<any[]>('/products?active=1'),
  });
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses', 'active'],
    queryFn: () => api<any[]>('/warehouses?active=1'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      api('/inventory/moves', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['moves'] });
      await qc.invalidateQueries({ queryKey: ['balances'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.stockMoves')}
        </Typography.Title>
        {hasPermission('inventory.write') && (
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({
                moveType: 'IN',
                moveDate: dayjs(),
                lines: [{ qty: 1, unitCost: 0 }],
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
        columns={[
          { title: t('code'), dataIndex: 'code' },
          { title: 'Type', dataIndex: 'moveType' },
          {
            title: t('menu.warehouses'),
            render: (_, r) => r.warehouse?.code,
          },
          { title: t('date'), render: (_, r) => String(r.moveDate).slice(0, 10) },
          {
            title: t('qty'),
            render: (_, r) => r.lines?.reduce((s: number, l: any) => s + Number(l.qty), 0),
          },
        ]}
      />
      <FormDrawer
        open={open}
        title={t('create')}
        width={640}
        onClose={() => setOpen(false)}
        loading={save.isPending}
        onSubmit={() =>
          form.validateFields().then((v) =>
            save.mutate({
              ...v,
              moveDate: v.moveDate.format('YYYY-MM-DD'),
            }),
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="moveType" label="Type" rules={[{ required: true }]}>
            <Select
              options={['IN', 'OUT', 'TRANSFER', 'ADJUST'].map((v) => ({ value: v, label: v }))}
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
          <Form.Item noStyle shouldUpdate>
            {() =>
              form.getFieldValue('moveType') === 'TRANSFER' ? (
                <Form.Item name="toWarehouseId" label={zh ? '目标仓' : 'Kho đích'} rules={[{ required: true }]}>
                  <Select
                    options={warehouses.map((w: any) => ({
                      value: w.id,
                      label: `${w.code} — ${zh ? w.nameZh || w.nameVi : w.nameVi}`,
                    }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="moveDate" label={t('date')} rules={[{ required: true }]}>
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
                        style={{ width: 220 }}
                        placeholder="SKU"
                        options={products.map((p: any) => ({
                          value: p.id,
                          label: `${p.sku} — ${zh ? p.nameZh || p.nameVi : p.nameVi}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'qty']} rules={[{ required: true }]}>
                      <InputNumber min={0.0001} placeholder="Qty" />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'unitCost']}>
                      <InputNumber min={0} placeholder="Cost" />
                    </Form.Item>
                    <Button danger type="link" onClick={() => remove(field.name)}>
                      X
                    </Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ qty: 1, unitCost: 0 })} block>
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
