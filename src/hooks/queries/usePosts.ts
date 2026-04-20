import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import { postsApi } from '@/api/endpoints';

export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts.all,
    queryFn: postsApi.getAll,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: () => postsApi.get(id),
    enabled: !!id,
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: queryKeys.posts.comments(postId),
    queryFn: () => postsApi.getComments(postId),
    enabled: !!postId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; mediaUrl?: string; mediaType?: string; visibility?: string; location?: string }) =>
      postsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, text }: { postId: string; text: string }) => postsApi.addComment(postId, text),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}
