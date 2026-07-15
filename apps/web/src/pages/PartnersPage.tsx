import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

type Partner = {
  id: string;
  code: string;
  nameVi: string;
  nameZh?: string | null;
  type: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive: boolean;
};

export function PartnersPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['partners', 'ALL'],
    queryFn: () => api<Partner[]>('/partners'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/partners/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/partners', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['partners'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api(`/partners/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      message.success(t('success'));
      await qc.invalidateQueries({ queryKey: ['partners'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  const typeLabel = (type: string) => {
    if (type === 'CUSTOMER') return t('customer');
    if (type === 'SUPPLIER') return t('supplier');
    return zh ? '客户/供应商' : 'KH & NCC';
  };

  const columns = useMemo(
    () =>
      [
        { title: t('code'), dataIndex: 'code', width: 130 },
        {
          title: t('name'),
          render: (_: unknown, r: Partner) => (zh ? r.nameZh || r.nameVi : r.nameVi),
        },
        {
          title: zh ? '类型' : 'Loại',
          render: (_: unknown, r: Partner) => typeLabel(r.type),
        },
        { title: 'Phone', dataIndex: 'phone' },
        {
          title: t('status'),
          render: (_: unknown, r: Partner) => (
            <Tag color={r.isActive ? 'green' : 'default'}>
              {r.isActive ? t('active') : t('inactive')}
            </Tag>
          ),
        },
        hasPermission('partners.write') && {
          title: t('actions'),
          render: (_: unknown, r: Partner) => (
            <Space>
              <Button
                type="link"
                onClick={() => {
                  setEditing(r);
                  form.setFieldsValue(r);
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
        },
      ].filter(Boolean),
    [t, zh, hasPermission, form, deactivate],
  );

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.partners')}
        </Typography.Title>
        {hasPermission('partners.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ type: 'CUSTOMER', isActive: true });
              setOpen(true);
            }}
          >
            {t('create')}
          </Button>
        )}
      </Space>
      <Table rowKey="id" loading={isLoading} dataSource={data} columns={columns as never} />
      <FormDrawer
        open={open}
        title={editing ? t('edit') : t('create')}
        onClose={() => setOpen(false)}
        loading={save.isPending}
        onSubmit={() =>
          form.validateFields().then((v) => {
            const { code: _c, ...rest } = v;
            save.mutate(editing ? rest : rest);
          })
        }
      >
        <Form form={form} layout="vertical">
          {editing ? (
            <Form.Item label={t('code')}>
              <Input value={editing.code} disabled />
            </Form.Item>
          ) : (
            <Form.Item label={t('code')}>
              <Input disabled placeholder={t('autoCode')} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('autoCode')} (KH / NCC / DT)
              </Typography.Text>
            </Form.Item>
          )}
          <Form.Item name="nameVi" label={`${t('name')} (VI)`} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameZh" label={`${t('name')} (ZH)`}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label={zh ? '类型' : 'Loại'} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'CUSTOMER', label: t('customer') },
                { value: 'SUPPLIER', label: t('supplier') },
                { value: 'BOTH', label: zh ? '客户/供应商' : 'KH & NCC' },
              ]}
            />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="address" label={zh ? '地址' : 'Địa chỉ'}>
            <Input.TextArea rows={2} />
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
