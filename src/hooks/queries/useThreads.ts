import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { threadsApi } from '@/api/endpoints';

export function useThreads() {
  return useQuery({
    queryKey: queryKeys.threads.all,
    queryFn: async () => {
      const data = await threadsApi.getAll();
      return data.threads || [];
    },
  });
}

export function useThreadMessages(id: string) {
  return useQuery({
    queryKey: queryKeys.threads.messages(id),
    queryFn: async () => {
      const data = await threadsApi.getMessages(id);
      return data.messages || [];
    },
    enabled: !!id,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { participantIds: string[]; title?: string; type?: 'dm' | 'group' }) =>
      threadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, text, attachments }: { threadId: string; text: string; attachments?: string[] }) =>
      threadsApi.sendMessage(threadId, text, attachments),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.messages(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.threads.all });
    },
  });
}
