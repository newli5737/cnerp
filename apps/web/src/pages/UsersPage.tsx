import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Space, Switch, Table, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

export function UsersPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<any[]>('/users'),
  });
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api<any[]>('/roles'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/users/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.users')}
        </Typography.Title>
        {hasPermission('users.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ isActive: true, roleIds: [] });
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
          { title: 'Email', dataIndex: 'email' },
          { title: t('name'), dataIndex: 'fullName' },
          {
            title: t('menu.roles'),
            render: (_, r) => r.userRoles?.map((ur: any) => ur.role.code).join(', '),
          },
          {
            title: t('status'),
            render: (_, r) => (r.isActive ? t('active') : t('inactive')),
          },
          hasPermission('users.write')
            ? {
                title: t('actions'),
                render: (_, r) => (
                  <Button
                    type="link"
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        email: r.email,
                        fullName: r.fullName,
                        isActive: r.isActive,
                        roleIds: r.userRoles?.map((ur: any) => ur.roleId) ?? [],
                      });
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
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fullName" label={t('name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={editing ? [] : [{ required: true, min: 6 }]}>
            <Input.Password placeholder={editing ? '(keep blank)' : ''} />
          </Form.Item>
          <Form.Item name="roleIds" label={t('menu.roles')}>
            <Select mode="multiple" options={roles.map((r: any) => ({ value: r.id, label: r.code }))} />
          </Form.Item>
          <Form.Item name="isActive" label={t('status')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
