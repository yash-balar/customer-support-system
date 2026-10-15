import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import type { Organization } from "../../types";
import { queryKeys } from "../queryKeys";
import { organizationsService } from "./service";

export function useOrganizations(
  options?: Pick<
    UseQueryOptions<{ organizations: Organization[] }, Error>,
    "retry"
  >,
) {
  return useQuery({
    queryKey: queryKeys.organizations,
    queryFn: organizationsService.list,
    ...options,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) =>
      organizationsService.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
  });
}

export function useUpdateOrganizationSettings(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      name: string;
      supportEmail: string;
      timezone: string;
    }) => organizationsService.updateSettings(organizationId, settings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
  });
}
