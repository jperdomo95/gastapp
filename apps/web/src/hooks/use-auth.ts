import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse, LoginDto, RegisterDto } from '@gastapp/types';

/** The browser's IANA timezone, captured at login/register so the server can
 * default "today"/"this month" to the user's own calendar day. */
function browserTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      const { data } = await api.post<AuthResponse>('/auth/login', { ...dto, timezone: browserTimezone() });
      return data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (dto: RegisterDto) => {
      const { data } = await api.post<AuthResponse>('/auth/register', { ...dto, timezone: browserTimezone() });
      return data;
    },
    onSuccess: (data) => setAuth(data.accessToken, data.user),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => clear(),
  });
}
