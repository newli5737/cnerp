import { Layout, Menu, Dropdown, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  ShoppingOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  ImportOutlined,
  AccountBookOutlined,
  BarChartOutlined,
  SettingOutlined,
  GlobalOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  SwapOutlined,
  BankOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/components/AuthContext';
import i18n from '../../i18n';

const { Header, Sider, Content } = Layout;

export function AppLayout() {
  const { t } = useTranslation();
  const { user, logout, hasPermission } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const lang = i18n.language;

  const items = [
    hasPermission('dashboard.read') && {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">{t('menu.dashboard')}</Link>,
    },
    hasPermission('partners.read') && {
      key: '/partners',
      icon: <TeamOutlined />,
      label: <Link to="/partners">{t('menu.partners')}</Link>,
    },
    hasPermission('products.read') && {
      key: '/products',
      icon: <AppstoreOutlined />,
      label: <Link to="/products">{t('menu.products')}</Link>,
    },
    hasPermission('attributes.read') && {
      key: '/attributes',
      icon: <SettingOutlined />,
      label: <Link to="/attributes">{t('menu.attributes')}</Link>,
    },
    hasPermission('warehouses.read') && {
      key: '/warehouses',
      icon: <DatabaseOutlined />,
      label: <Link to="/warehouses">{t('menu.warehouses')}</Link>,
    },
    hasPermission('inventory.read') && {
      key: '/inventory',
      icon: <ShoppingOutlined />,
      label: <Link to="/inventory">{t('menu.inventory')}</Link>,
    },
    hasPermission('inventory.read') && {
      key: '/stock-moves',
      icon: <SwapOutlined />,
      label: <Link to="/stock-moves">{t('menu.stockMoves')}</Link>,
    },
    hasPermission('sales.read') && {
      key: '/sales',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/sales">{t('menu.sales')}</Link>,
    },
    hasPermission('purchase.read') && {
      key: '/purchase',
      icon: <ImportOutlined />,
      label: <Link to="/purchase">{t('menu.purchase')}</Link>,
    },
    hasPermission('ar.read') && {
      key: '/invoices',
      icon: <AccountBookOutlined />,
      label: <Link to="/invoices">{t('menu.invoices')}</Link>,
    },
    hasPermission('vouchers.read') && {
      key: '/cash',
      icon: <WalletOutlined />,
      label: <Link to="/cash">{t('menu.cash')}</Link>,
    },
    hasPermission('vouchers.read') && {
      key: '/bank',
      icon: <BankOutlined />,
      label: <Link to="/bank">{t('menu.bank')}</Link>,
    },
    hasPermission('reports.read') && {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: <Link to="/reports">{t('menu.reports')}</Link>,
    },
    hasPermission('users.read') && {
      key: '/users',
      icon: <TeamOutlined />,
      label: <Link to="/users">{t('menu.users')}</Link>,
    },
    hasPermission('roles.read') && {
      key: '/roles',
      icon: <SettingOutlined />,
      label: <Link to="/roles">{t('menu.roles')}</Link>,
    },
  ].filter(Boolean) as { key: string; icon: React.ReactNode; label: React.ReactNode }[];

  const switchLang = (lng: string) => {
    void i18n.changeLanguage(lng);
    localStorage.setItem('cnerp_lang', lng);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth={64} width={232}>
        <div className="sider-brand">
          <img src="/cnerp-logo.png" alt="" />
          <span>CNERP</span>
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[loc.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Typography.Text strong>
            {lang === 'zh' ? user?.company.nameZh || user?.company.nameVi : user?.company.nameVi}
          </Typography.Text>
          <Space>
            <Dropdown
              menu={{
                items: [
                  { key: 'vi', label: 'Tiếng Việt', onClick: () => switchLang('vi') },
                  { key: 'zh', label: '中文', onClick: () => switchLang('zh') },
                ],
              }}
            >
              <Button icon={<GlobalOutlined />}>{t('language')}</Button>
            </Dropdown>
            <Typography.Text>{user?.fullName}</Typography.Text>
            <Button
              icon={<LogoutOutlined />}
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              {t('logout')}
            </Button>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
