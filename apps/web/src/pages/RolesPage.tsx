import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, Select, Space, Table, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api<any[]>('/roles'),
  });
  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => api<any[]>('/permissions'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/roles/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/roles', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.roles')}
        </Typography.Title>
        {hasPermission('roles.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ permissionCodes: [] });
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
            title: t('name'),
            render: (_, r) => (zh ? r.nameZh || r.nameVi : r.nameVi),
          },
          {
            title: 'Permissions',
            render: (_, r) => r.rolePermissions?.length ?? 0,
          },
          hasPermission('roles.write')
            ? {
                title: t('actions'),
                render: (_, r) => (
                  <Button
                    type="link"
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        code: r.code,
                        nameVi: r.nameVi,
                        nameZh: r.nameZh,
                        permissionCodes: r.rolePermissions?.map((rp: any) => rp.permission.code) ?? [],
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
        width={640}
        onClose={() => setOpen(false)}
        loading={save.isPending}
        onSubmit={() => form.validateFields().then((v) => save.mutate(v))}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label={t('code')} rules={[{ required: true }]}>
            <Input disabled={!!editing?.isSystem} />
          </Form.Item>
          <Form.Item name="nameVi" label={`${t('name')} (VI)`} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nameZh" label={`${t('name')} (ZH)`}>
            <Input />
          </Form.Item>
          <Form.Item name="permissionCodes" label="Permissions">
            <Select
              mode="multiple"
              optionFilterProp="label"
              options={permissions.map((p: any) => ({
                value: p.code,
                label: `${p.code} — ${zh ? p.nameZh || p.nameVi : p.nameVi}`,
              }))}
            />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
