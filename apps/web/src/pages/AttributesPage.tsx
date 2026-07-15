import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Form, Input, InputNumber, Select, Space, Table, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

type Attr = {
  id: string;
  code: string;
  nameVi: string;
  nameZh?: string | null;
  dataType: string;
  optionsJson?: string[] | null;
  sortOrder: number;
};

export function AttributesPage() {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Attr | null>(null);
  const [form] = Form.useForm();

  const { data = [], isLoading } = useQuery({
    queryKey: ['attributes'],
    queryFn: () => api<Attr[]>('/product-attributes'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) =>
      editing
        ? api(`/product-attributes/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : api('/product-attributes', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['attributes'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('menu.attributes')}
        </Typography.Title>
        {hasPermission('attributes.write') && (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ dataType: 'TEXT', sortOrder: 0 });
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
          { title: 'Type', dataIndex: 'dataType' },
          {
            title: 'Options',
            render: (_, r) => (Array.isArray(r.optionsJson) ? r.optionsJson.join(', ') : ''),
          },
          hasPermission('attributes.write')
            ? {
                title: t('actions'),
                render: (_, r) => (
                  <Button
                    type="link"
                    onClick={() => {
                      setEditing(r);
                      form.setFieldsValue({
                        ...r,
                        optionsText: Array.isArray(r.optionsJson) ? r.optionsJson.join(',') : '',
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
        onSubmit={() =>
          form.validateFields().then((v) => {
            const optionsJson =
              v.dataType === 'SELECT' && v.optionsText
                ? String(v.optionsText)
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : null;
            const { optionsText: _, ...rest } = v;
            save.mutate({ ...rest, optionsJson });
          })
        }
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
          <Form.Item name="dataType" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'TEXT', label: 'TEXT' },
                { value: 'NUMBER', label: 'NUMBER' },
                { value: 'SELECT', label: 'SELECT' },
              ]}
            />
          </Form.Item>
          <Form.Item name="optionsText" label="Options (comma)">
            <Input placeholder="Đỏ,Xanh,Đen" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
