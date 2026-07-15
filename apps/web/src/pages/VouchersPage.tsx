import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Table, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api-client';
import { FormDrawer } from '../components/form/FormDrawer';
import { useAuth } from '../features/auth/components/AuthContext';

type Props = { channel: 'cash' | 'bank' };

export function VouchersPage({ channel }: Props) {
  const { t, i18n } = useTranslation();
  const zh = i18n.language === 'zh';
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const path = channel === 'cash' ? '/cash-vouchers' : '/bank-vouchers';

  const { data = [], isLoading } = useQuery({
    queryKey: [channel],
    queryFn: () => api<any[]>(path),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api<any[]>('/partners'),
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<any[]>('/ar-ap/invoices'),
  });

  const save = useMutation({
    mutationFn: (body: unknown) => api(path, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: async () => {
      message.success(t('success'));
      setOpen(false);
      await qc.invalidateQueries({ queryKey: [channel] });
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await qc.invalidateQueries({ queryKey: ['partner-balances'] });
    },
    onError: (e: Error) => message.error(e.message),
  });

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {channel === 'cash' ? t('menu.cash') : t('menu.bank')}
        </Typography.Title>
        {hasPermission('vouchers.write') && (
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              form.setFieldsValue({ type: 'RECEIPT', voucherDate: dayjs() });
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
          { title: 'Type', dataIndex: 'type' },
          {
            title: zh ? '单位' : 'Đối tác',
            render: (_, r) =>
              r.partner ? (zh ? r.partner.nameZh || r.partner.nameVi : r.partner.nameVi) : '-',
          },
          { title: t('date'), render: (_, r) => String(r.voucherDate).slice(0, 10) },
          { title: t('amount'), render: (_, r) => Number(r.amount).toLocaleString() },
          { title: t('note'), dataIndex: 'note' },
        ]}
      />
      <FormDrawer
        open={open}
        title={t('create')}
        onClose={() => setOpen(false)}
        loading={save.isPending}
        onSubmit={() =>
          form.validateFields().then((v) =>
            save.mutate({
              ...v,
              voucherDate: v.voucherDate.format('YYYY-MM-DD'),
              invoiceId: v.invoiceId || null,
              partnerId: v.partnerId || null,
            }),
          )
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'RECEIPT', label: zh ? '收款' : 'Thu' },
                { value: 'PAYMENT', label: zh ? '付款' : 'Chi' },
              ]}
            />
          </Form.Item>
          <Form.Item name="voucherDate" label={t('date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="partnerId" label={zh ? '单位' : 'Đối tác'}>
            <Select
              allowClear
              options={partners.map((p: any) => ({
                value: p.id,
                label: `${p.code} — ${zh ? p.nameZh || p.nameVi : p.nameVi}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} />
          </Form.Item>
          <Form.Item name="invoiceId" label={zh ? '核销发票' : 'Áp hóa đơn'}>
            <Select
              allowClear
              options={invoices
                .filter((i: any) => ['POSTED', 'PARTIAL'].includes(i.status))
                .map((i: any) => ({
                  value: i.id,
                  label: `${i.code} — ${Number(i.totalAmount) - Number(i.paidAmount)}`,
                }))}
            />
          </Form.Item>
          <Form.Item name="note" label={t('note')}>
            <Input />
          </Form.Item>
        </Form>
      </FormDrawer>
    </div>
  );
}
