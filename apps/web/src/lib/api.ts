import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import { API_BASE } from '@/lib/env';

export const api = axios.create({ baseURL: API_BASE, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status !== 401 || !original || original._retried) {
      throw error;
    }
    original._retried = true;

    refreshing ??= (async () => {
      try {
        const { data } = await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        useAuthStore.getState().setAuth(data.accessToken, data.user);
        return data.accessToken as string;
      } catch {
        useAuthStore.getState().clear();
        return null;
      } finally {
        refreshing = null;
      }
    })();

    const newToken = await refreshing;
    if (!newToken) throw error;
    original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
    return api.request(original);
  },
);
