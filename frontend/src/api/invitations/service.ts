import { axiosClient } from "../axiosClient";

export interface PendingInvitation {
  _id: string;
  email: string;
  role: string;
  organizationId: { _id: string; name: string };
}

export const invitationsService = {
  async list() {
    const { data } = await axiosClient.get<{
      invitations: PendingInvitation[];
    }>("/invitations");
    return data;
  },
  async accept(invitationId: string) {
    const { data } = await axiosClient.post<{
      membership: { organizationId: string };
    }>(`/invitations/${invitationId}/accept`);
    return data;
  },
  async invite(
    organizationId: string,
    invitation: { email: string; role: string },
  ) {
    const { data } = await axiosClient.post(
      `/organizations/${organizationId}/invitations`,
      invitation,
    );
    return data;
  },
};
