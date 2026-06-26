import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CategoryBreakdown, MonthlyTotal, ReportRangeQuery, TopMerchant } from '@gastapp/types';

export function useMonthlyTotals(range: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'monthly', range],
    queryFn: async () => (await api.get<MonthlyTotal[]>('/reports/monthly', { params: range })).data,
  });
}

export function useCategoryBreakdown(range: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'by-category', range],
    queryFn: async () =>
      (await api.get<CategoryBreakdown[]>('/reports/by-category', { params: range })).data,
  });
}

export function useTopMerchants(range: ReportRangeQuery) {
  return useQuery({
    queryKey: ['reports', 'top-merchants', range],
    queryFn: async () =>
      (await api.get<TopMerchant[]>('/reports/top-merchants', { params: range })).data,
  });
}
