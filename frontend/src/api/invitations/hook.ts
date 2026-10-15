import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "../../types";
import { queryKeys } from "../queryKeys";
import { invitationsService } from "./service";

export function useInvitations(userId?: string) {
  return useQuery({
    queryKey: queryKeys.invitations(userId),
    queryFn: invitationsService.list,
    enabled: Boolean(userId),
    refetchOnMount: "always",
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      invitationsService.accept(invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
  });
}

export function useInviteMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitation: {
      email: string;
      role: Exclude<Role, "Owner">;
    }) =>
      invitationsService.invite(organizationId, invitation),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations() }),
  });
}
