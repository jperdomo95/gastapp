import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreateSavingsGoalDto, SavingsGoal, UpdateSavingsGoalDto } from '@gastapp/types';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await api.get<SavingsGoal[]>('/goals')).data,
  });
}

/** Writes return the whole list, so it goes straight into the cache. */
function useSetGoals() {
  const qc = useQueryClient();
  return (goals: SavingsGoal[]) => qc.setQueryData(['goals'], goals);
}

export function useCreateGoal() {
  const setGoals = useSetGoals();
  return useMutation({
    mutationFn: async (dto: CreateSavingsGoalDto) =>
      (await api.post<SavingsGoal[]>('/goals', dto)).data,
    onSuccess: setGoals,
  });
}

export function useUpdateGoal() {
  const setGoals = useSetGoals();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateSavingsGoalDto }) =>
      (await api.patch<SavingsGoal[]>(`/goals/${id}`, dto)).data,
    onSuccess: setGoals,
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}
