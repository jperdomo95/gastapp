import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  CreateSubscriptionDto, UpdateSubscriptionDto, Subscription, ListSubscriptionsQuery,
  CreateAmountChangeDto, RecurringCandidate,
} from '@gastapp/types';

/**
 * Subscription writes can materialise expenses server-side, so every mutation
 * invalidates the ledger and the reports too — not just the subscription list.
 */
function useSubscriptionInvalidation() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['subscriptions'] });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['goals'] });
    qc.invalidateQueries({ queryKey: ['reports'] });
  };
}

export function useSubscriptions(query: Partial<ListSubscriptionsQuery> = {}) {
  return useQuery({
    queryKey: ['subscriptions', query],
    queryFn: async () => {
      const { data } = await api.get<Subscription[]>('/subscriptions', { params: query });
      return data;
    },
  });
}

/**
 * Repeating charges found in the ledger that may be subscriptions. Lives under
 * the 'subscriptions' key so creating or deleting one re-checks what is tracked.
 */
export function useRecurringCandidates() {
  return useQuery({
    queryKey: ['subscriptions', 'candidates'],
    queryFn: async () =>
      (await api.get<RecurringCandidate[]>('/subscriptions/candidates')).data,
  });
}

export function useCreateSubscription() {
  const invalidate = useSubscriptionInvalidation();
  return useMutation({
    mutationFn: async (dto: CreateSubscriptionDto) =>
      (await api.post<Subscription>('/subscriptions', dto)).data,
    onSuccess: invalidate,
  });
}

export function useUpdateSubscription() {
  const invalidate = useSubscriptionInvalidation();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateSubscriptionDto }) =>
      (await api.patch<Subscription>(`/subscriptions/${id}`, dto)).data,
    onSuccess: invalidate,
  });
}

export function useAddPriceChange() {
  const invalidate = useSubscriptionInvalidation();
  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: CreateAmountChangeDto }) =>
      (await api.post<Subscription>(`/subscriptions/${id}/price-changes`, dto)).data,
    onSuccess: invalidate,
  });
}

export function useRemovePriceChange() {
  const invalidate = useSubscriptionInvalidation();
  return useMutation({
    mutationFn: async ({ id, changeId }: { id: string; changeId: string }) =>
      (await api.delete<Subscription>(`/subscriptions/${id}/price-changes/${changeId}`)).data,
    onSuccess: invalidate,
  });
}

export function useDeleteSubscription() {
  const invalidate = useSubscriptionInvalidation();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/subscriptions/${id}`),
    onSuccess: invalidate,
  });
}
