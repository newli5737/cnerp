import { Button, Form, Input, Typography, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../../lib/api-client';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation();

  const onFinish = async (values: { email: string; password: string }) => {
    try {
      await api('/auth/login', { method: 'POST', body: JSON.stringify(values) });
      await refetch();
      message.success(t('success'));
      navigate('/');
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('failed'));
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero" style={{ backgroundImage: 'url(/login-hero.png)' }} />
      <div className="login-panel">
        <div className="login-card">
          <div className="login-brand">
            <img src="/cnerp-logo.png" alt="CNERP" className="login-logo" />
            <Typography.Title level={3} className="login-title">
              {tc('appName')}
            </Typography.Title>
            <Typography.Text type="secondary">{tc('tagline')}</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="email" label={t('email')} rules={[{ required: true, type: 'email' }]}>
              <Input prefix={<MailOutlined />} size="large" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label={t('password')} rules={[{ required: true, min: 6 }]}>
              <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              {t('submit')}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
