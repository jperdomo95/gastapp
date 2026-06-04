import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CategoryBreakdown, MonthlyTotal, ReportRangeQuery } from '@gastapp/types';

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
