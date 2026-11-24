import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  BudgetBucket, CreateBudgetBucketDto, UpdateBudgetBucketDto,
  CreateIncomeDto, CreateIncomeSourceDto, Income, IncomeSource, PayCycle,
  UpdateIncomeSourceDto,
} from '@gastapp/types';

/**
 * Income writes move the pay cycle, so everything under 'income' refetches.
 * Set-asides fund goals (and deleting one folds its goals' progress in), so goals too.
 */
function useIncomeInvalidation() {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: ['income'] }),
    qc.invalidateQueries({ queryKey: ['goals'] }),
  ]);
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

export function useBuckets() {
  return useQuery({
    queryKey: ['income', 'buckets'],
    queryFn: async () => (await api.get<BudgetBucket[]>('/income/buckets')).data,
  });
}

export function useCreateBucket() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (dto: CreateBudgetBucketDto) =>
      (await api.post<BudgetBucket>('/income/buckets', dto)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateBucket() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBudgetBucketDto }) =>
      (await api.patch<BudgetBucket>(`/income/buckets/${id}`, dto)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteBucket() {
  const invalidate = useIncomeInvalidation();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/income/buckets/${id}`);
    },
    onSuccess: invalidate,
  });
}
