import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@gastapp/types';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => (await api.get<User>('/users/me')).data,
  });
}

export function useUpdateTimezone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (timezone: string) => (await api.patch<User>('/users/me', { timezone })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users', 'me'] }),
  });
}
