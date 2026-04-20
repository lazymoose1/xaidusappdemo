import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { authApi } from '@/api/endpoints';
import { useAuth } from '@/providers/AuthProvider';

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile(user?.id),
    queryFn: authApi.getMe,
    enabled: !!user,
  });
}
