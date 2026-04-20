import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { parentPortalApi } from '@/api/endpoints';

export function useParentChildren() {
  return useQuery({
    queryKey: queryKeys.parentPortal.children,
    queryFn: parentPortalApi.getChildren,
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: queryKeys.parentPortal.weeklySummary,
    queryFn: parentPortalApi.getWeeklySummary,
  });
}

export function useParentDashboard() {
  return useQuery({
    queryKey: queryKeys.parentPortal.dashboard,
    queryFn: parentPortalApi.getDashboard,
  });
}
