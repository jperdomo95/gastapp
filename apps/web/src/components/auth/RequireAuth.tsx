import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE } from '@/lib/env';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken, user, setAuth, clear } = useAuthStore();
  const [bootstrapped, setBootstrapped] = useState(!!accessToken);
  const refreshing = useRef(false);

  useEffect(() => {
    if (accessToken) return;
    if (refreshing.current) return;
    refreshing.current = true;
    (async () => {
      try {
        const { data } = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        setAuth(data.accessToken, data.user);
      } catch {
        clear();
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [accessToken, setAuth, clear]);

  if (!bootstrapped) {
    return <div className="flex h-full items-center justify-center text-pulse-faint">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
