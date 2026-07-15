import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Space, Table, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

type Wh = { id: string; code: string; nameVi: string; nameZh?: string | null; isActive: boolean };

export function WarehousesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wh | null>(null);
  const [form] = Form.useForm();
  const { data = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api<Wh[]>('/warehouses'),
  });
  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/warehouses/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/warehouses', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.warehouses')}
        </Typography.Title>
        {hasPermission('warehouses.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
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
          { title: t('name'), render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi) },
          hasPermission('warehouses.write')
            ? {
                title: t('actions'),
                render: (_, r) => (
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
              }
            : {},
        ]}
      />
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
        </Form>
      </FormDrawer>
    </div>
  );
}
