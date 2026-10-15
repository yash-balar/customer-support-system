import { axiosClient } from "../axiosClient";
import type { Organization } from "../../types";

export interface OrganizationsResponse {
  organizations: Organization[];
}

export const organizationsService = {
  async list() {
    const { data } = await axiosClient.get<OrganizationsResponse>("/organizations");
    return data;
  },
  async create(name: string) {
    const { data } = await axiosClient.post<{ organization: Organization }>(
      "/organizations",
      { name },
    );
    return data;
  },
  async updateSettings(
    organizationId: string,
    settings: { name: string; supportEmail: string; timezone: string },
  ) {
    const { data } = await axiosClient.patch(
      `/organizations/${organizationId}/settings`,
      settings,
    );
    return data;
  },
};
