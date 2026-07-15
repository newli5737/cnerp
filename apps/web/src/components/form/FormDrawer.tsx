import { Drawer, Space, Button } from 'antd';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  loading?: boolean;
  children: ReactNode;
  width?: number;
};

export function FormDrawer({
  open,
  title,
  onClose,
  onSubmit,
  loading,
  children,
  width = 520,
}: Props) {
  const { t } = useTranslation();
  return (
    <Drawer
      open={open}
      title={title}
      onClose={onClose}
      width={width}
      destroyOnClose
      footer={
        <Space style={{ float: 'right' }}>
          <Button onClick={onClose}>{t('cancel')}</Button>
          {onSubmit && (
            <Button type="primary" loading={loading} onClick={onSubmit}>
              {t('save')}
            </Button>
          )}
        </Space>
      }
    >
      {children}
    </Drawer>
  );
}
