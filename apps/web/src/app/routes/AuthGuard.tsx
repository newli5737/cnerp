import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../../features/auth/components/AuthContext';

export function AuthGuard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
