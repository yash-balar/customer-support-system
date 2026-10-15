import { axiosClient } from "../axiosClient";
import type { Member, Role } from "../../types";

export const teamService = {
  async listMembers(organizationId: string) {
    const { data } = await axiosClient.get<{ members: Member[] }>(
      `/organizations/${organizationId}/members`,
    );
    return data;
  },
  async updateMember(
    organizationId: string,
    memberId: string,
    value: { role?: Role; status?: "active" | "inactive" },
  ) {
    const { data } = await axiosClient.patch(
      `/organizations/${organizationId}/members/${memberId}`,
      value,
    );
    return data;
  },
  async removeMember(organizationId: string, memberId: string) {
    await axiosClient.delete(
      `/organizations/${organizationId}/members/${memberId}`,
    );
  },
};
