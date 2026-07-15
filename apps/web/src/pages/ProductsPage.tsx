import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, InputNumber, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

type Product = {
  id: string;
  sku: string;
  nameVi: string;
  nameZh?: string | null;
  unit: string;
  salePrice: string | number;
  costPrice: string | number;
  minStock: string | number;
  isActive: boolean;
};

export function ProductsPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api<Product[]>('/products'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/products', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      message.success(t('success'));
      await qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.products')}
        </Typography.Title>
        {hasPermission('products.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({
                unit: 'Cái',
                salePrice: 0,
                costPrice: 0,
                minStock: 0,
                isActive: true,
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
          { title: 'SKU', dataIndex: 'sku', width: 140 },
          {
            title: t('name'),
            render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
          },
          { title: zh ? '单位' : 'ĐVT', dataIndex: 'unit', width: 80 },
          {
            title: zh ? '售价' : 'Giá bán',
            render: (_, r) => Number(r.salePrice).toLocaleString(),
            align: 'right',
          },
          {
            title: zh ? '成本' : 'Giá vốn',
            render: (_, r) => Number(r.costPrice).toLocaleString(),
            align: 'right',
          },
          {
            title: t('status'),
            width: 100,
            render: (_, r) => (
              <Tag color={r.isActive ? 'green' : 'default'}>
                {r.isActive ? t('active') : t('inactive')}
              </Tag>
            ),
          },
          hasPermission('products.write')
            ? {
                title: t('actions'),
                width: 160,
                render: (_, r) => (
                  <Space>
                    <Button
                      type="link"
                      onClick={() => {
                        setEditing(r);
                        form.setFieldsValue({
                          ...r,
                          salePrice: Number(r.salePrice),
                          costPrice: Number(r.costPrice),
                          minStock: Number(r.minStock),
                        });
                        setOpen(true);
                      }}
                    >
                      {t('edit')}
                    </Button>
                    {r.isActive && (
                      <Button type="link" danger onClick={() => deactivate.mutate(r.id)}>
                        {t('delete')}
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
        title={editing ? t('edit') : t('create')}
        onClose={() => setOpen(false)}
        loading={save.isPending}
        onSubmit={() =>
          form.validateFields().then((v) => {
            const { sku: _sku, ...rest } = v;
            save.mutate(editing ? rest : rest);
          })
        }
      >
        <Form form={form} layout="vertical">
          {editing ? (
            <Form.Item label="SKU">
              <Input value={editing.sku} disabled />
            </Form.Item>
          ) : (
            <Form.Item label="SKU">
              <Input disabled placeholder={t('skuAuto')} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('skuAuto')} (SP + năm + số)
              </Typography.Text>
            </Form.Item>
          )}
          <Form.Item name="nameVi" label={`${t('name')} (VI)`} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameZh" label={`${t('name')} (ZH)`}>
            <Input />
          </Form.Item>
          <Form.Item name="unit" label={zh ? '单位' : 'Đơn vị tính'} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="salePrice" label={zh ? '售价' : 'Giá bán'} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="costPrice" label={zh ? '成本' : 'Giá vốn'}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="minStock" label={zh ? '最低库存' : 'Tồn tối thiểu'}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label={t('status')} valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </FormDrawer>
    </div>
  );
}
