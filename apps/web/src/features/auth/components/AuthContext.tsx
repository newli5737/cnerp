import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../../../lib/api-client';

export type AuthMe = {
  id: string;
  email: string;
  fullName: string;
  permissions: string[];
  company: { id: string; code: string; nameVi: string; nameZh?: string | null };
};

type AuthCtx = {
  user: AuthMe | null;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const me = await api<AuthMe>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (code: string) => {
      if (!user) return false;
      if (user.permissions.includes('*')) return true;
      return user.permissions.includes(code);
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, refetch, logout, hasPermission }),
    [user, loading, refetch, logout, hasPermission],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}
