import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateExpenseDto, UpdateExpenseDto, Expense, ListExpensesQuery, Category,
  ImportExpensesResult,
} from '@gastapp/types';

export function useExpenses(query: Partial<ListExpensesQuery> = {}) {
  return useQuery({
    queryKey: ['expenses', query],
    queryFn: async () => {
      const { data } = await api.get<{ items: Expense[]; total: number; page: number; pageSize: number }>(
        '/expenses',
        { params: query },
      );
      return data;
    },
  });
}

export function useImportExpenses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, categoryId }: { file: File; categoryId: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('categoryId', categoryId);
      const { data } = await api.post<ImportExpensesResult>('/expenses/import', form);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateExpenseDto) => (await api.post<Expense>('/expenses', dto)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateExpenseDto }) =>
      (await api.patch<Expense>(`/expenses/${id}`, dto)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
