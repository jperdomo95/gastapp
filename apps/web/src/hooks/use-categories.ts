import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@gastapp/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/categories')).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateCategoryDto) => (await api.post<Category>('/categories', dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      (await api.patch<Category>(`/categories/${id}`, dto)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reassignTo }: { id: string; reassignTo?: string }) =>
      api.delete(`/categories/${id}`, { params: reassignTo ? { reassignTo } : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      // Reassignment moves expense rows, which also changes report aggregates.
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
