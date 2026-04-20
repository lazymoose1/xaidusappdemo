import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { achievementsApi } from '@/api/endpoints';

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: achievementsApi.get,
  });
}
