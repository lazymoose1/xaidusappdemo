import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { remindersApi } from '@/api/endpoints';

export function useReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: remindersApi.getDue,
  });
}

export function useDueReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: remindersApi.getDue,
  });
}
