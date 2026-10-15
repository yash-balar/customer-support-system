import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { conversationsService } from "./service";

export function useConversations(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.conversations(organizationId),
    queryFn: () => conversationsService.list(organizationId),
  });
}

export function useCreateConversation(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: {
      subject: string;
      customerName: string;
      customerEmail: string;
    }) => conversationsService.create(organizationId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(organizationId),
      }),
  });
}

export function useConversationMessages(
  organizationId: string,
  conversationId: string,
) {
  return useQuery({
    queryKey: queryKeys.messages(organizationId, conversationId),
    queryFn: () =>
      conversationsService.listMessages(organizationId, conversationId),
  });
}

export function useCreateConversationMessage(
  organizationId: string,
  conversationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      conversationsService.createMessage(
        organizationId,
        conversationId,
        body,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages(organizationId, conversationId),
      }),
  });
}

export function useUpdateConversation(
  organizationId: string,
  conversationId: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: { status?: string; assigneeId?: string | null }) =>
      conversationsService.update(organizationId, conversationId, values),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(organizationId),
      }),
  });
}
