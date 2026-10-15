import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../queryKeys";
import { auditService } from "./service";

export function useAuditEntries(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.audit(organizationId),
    queryFn: () => auditService.list(organizationId),
  });
}
