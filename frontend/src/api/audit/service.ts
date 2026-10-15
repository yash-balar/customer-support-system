import { axiosClient } from "../axiosClient";
import type { AuditEntry } from "../../types";

export const auditService = {
  async list(organizationId: string) {
    const { data } = await axiosClient.get<{ entries: AuditEntry[] }>(
      `/organizations/${organizationId}/audit-logs`,
    );
    return data;
  },
};
