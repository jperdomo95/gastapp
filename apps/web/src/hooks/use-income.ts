import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateIncomeDto, CreateIncomeSourceDto, Income, IncomeSource, PayCycle,
  UpdateIncomeSourceDto,
} from '@gastapp/types';

/** Income writes move the pay cycle, so everything under 'income' refetches. */
function useIncomeInvalidation() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['income'] });
}

export function usePayCycle() {
  return useQuery({
    queryKey: ['income', 'cycle'],
    queryFn: async () =>
      (await api.get<{ cycle: PayCycle | null }>('/income/cycle')).data.cycle,
  });
}

export function useIncomeSources() {
  return useQuery({
    queryKey: ['income', 'sources'],
    queryFn: async () => (await api.get<IncomeSource[]>('/income/sources')).data,
  });
}

export function useIncome() {
  return useQuery({
    queryKey: ['income', 'list'],
    queryFn: async () => (await api.get<Income[]>('/income')).data,
  });
}

export function useCreateIncomeSource() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (dto: CreateIncomeSourceDto) =>
      (await api.post<IncomeSource>('/income/sources', dto)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateIncomeSource() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateIncomeSourceDto }) =>
      (await api.patch<IncomeSource>(`/income/sources/${id}`, dto)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteIncomeSource() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/income/sources/${id}`);
    },
    onSuccess: invalidate,
  });
}

export function useCreateIncome() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (dto: CreateIncomeDto) => (await api.post<Income>('/income', dto)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteIncome() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/income/${id}`);
    },
    onSuccess: invalidate,
  });
}
