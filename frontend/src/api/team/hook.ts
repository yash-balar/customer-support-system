import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "../../types";
import { queryKeys } from "../queryKeys";
import { teamService } from "./service";

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.members(organizationId),
    queryFn: () => teamService.listMembers(organizationId),
  });
}

export function useUpdateMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      value,
    }: {
      memberId: string;
      value: { role?: Role; status?: "active" | "inactive" };
    }) => teamService.updateMember(organizationId, memberId, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.members(organizationId) }),
  });
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      teamService.removeMember(organizationId, memberId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.members(organizationId) }),
  });
}
