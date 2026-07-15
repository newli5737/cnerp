import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
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
    queryKey: ['partners'],
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

  const columns = useMemo(
    () => [
      { title: t('code'), dataIndex: 'code' },
      {
        title: t('name'),
        render: (_: unknown, r: Partner) => (zh ? r.nameZh || r.nameVi : r.nameVi),
      },
      { title: 'Type', dataIndex: 'type' },
      { title: 'Phone', dataIndex: 'phone' },
      {
        title: t('status'),
        render: (_: unknown, r: Partner) => (
          <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? t('active') : t('inactive')}</Tag>
        ),
      },
      hasPermission('partners.write') && {
        title: t('actions'),
        render: (_: unknown, r: Partner) => (
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
        ),
      },
    ].filter(Boolean),
    [t, zh, hasPermission, form],
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
        onSubmit={() => form.validateFields().then((v) => save.mutate(v))}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label={t('code')} rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item name="nameVi" label={`${t('name')} (VI)`} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameZh" label={`${t('name')} (ZH)`}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'CUSTOMER', label: 'CUSTOMER' },
                { value: 'SUPPLIER', label: 'SUPPLIER' },
                { value: 'BOTH', label: 'BOTH' },
              ]}
            />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
