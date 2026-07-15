import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import zhCN from 'antd/locale/zh_CN';
import './i18n';
import i18n from './i18n';
import './styles.css';
import { cnerpTheme } from './app/theme';
import { AuthProvider } from './features/auth/components/AuthContext';
import { LoginPage } from './features/auth/components/LoginPage';
import { AuthGuard } from './app/routes/AuthGuard';
import { AppLayout } from './app/layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { PartnersPage } from './pages/PartnersPage';
import { ProductsPage } from './pages/ProductsPage';
import { AttributesPage } from './pages/AttributesPage';
import { WarehousesPage } from './pages/WarehousesPage';
import { InventoryPage } from './pages/InventoryPage';
import { StockMovesPage } from './pages/StockMovesPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasePage } from './pages/PurchasePage';
import { InvoicesPage } from './pages/InvoicesPage';
import { VouchersPage } from './pages/VouchersPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';

const qc = new QueryClient();

function AntdLocale({ children }: { children: React.ReactNode }) {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const handler = () => setTick((x) => x + 1);
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);
  const locale = i18n.language === 'zh' ? zhCN : viVN;
  return (
    <ConfigProvider theme={cnerpTheme} locale={locale}>
      {children}
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AntdLocale>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AuthGuard />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="partners" element={<PartnersPage />} />
                  <Route path="products" element={<ProductsPage />} />
                  <Route path="attributes" element={<AttributesPage />} />
                  <Route path="warehouses" element={<WarehousesPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="stock-moves" element={<StockMovesPage />} />
                  <Route path="sales" element={<SalesPage />} />
                  <Route path="purchase" element={<PurchasePage />} />
                  <Route path="invoices" element={<InvoicesPage />} />
                  <Route path="cash" element={<VouchersPage channel="cash" />} />
                  <Route path="bank" element={<VouchersPage channel="bank" />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="roles" element={<RolesPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntdLocale>
    </QueryClientProvider>
  </React.StrictMode>,
);
