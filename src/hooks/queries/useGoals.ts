import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { goalsApi } from '@/api/endpoints';
import type { CreateGoalInput, CheckinInput, UpdateScheduleInput, AddMilestoneInput } from '@/types/api';

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: goalsApi.getAll,
  });
}

export function useTodayGoals() {
  return useQuery({
    queryKey: queryKeys.goals.today,
    queryFn: goalsApi.getToday,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGoalInput) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
    },
  });
}

export function useCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CheckinInput }) => goalsApi.checkin(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
    },
  });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScheduleInput }) => goalsApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

export function useAddMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddMilestoneInput }) => goalsApi.addMilestone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });
}

export function useWeeklyReset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shrinkToOneDay?: boolean) => goalsApi.weeklyReset(shrinkToOneDay),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.today });
    },
  });
}
