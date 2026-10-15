import { axiosClient } from "../axiosClient";
import type { Ticket } from "../../types";
import type { TicketFormValues } from "../../pages/ticket/shared";

export interface TicketListResponse {
  tickets: Ticket[];
  pagination: { page: number; pages: number; total: number };
}

export const ticketsService = {
  async list(organizationId: string, filters: string) {
    const { data } = await axiosClient.get<TicketListResponse>(
      `/organizations/${organizationId}/tickets?${filters}`,
    );
    return data;
  },
  async get(organizationId: string, ticketId: string) {
    const { data } = await axiosClient.get<{ ticket: Ticket }>(
      `/organizations/${organizationId}/tickets/${ticketId}`,
    );
    return data;
  },
  async create(organizationId: string, values: TicketFormValues) {
    const { data } = await axiosClient.post<{ ticket: Ticket }>(
      `/organizations/${organizationId}/tickets`,
      values,
    );
    return data;
  },
  async update(
    organizationId: string,
    ticketId: string,
    updates: Partial<TicketFormValues>,
  ) {
    const { data } = await axiosClient.patch<{ ticket: Ticket }>(
      `/organizations/${organizationId}/tickets/${ticketId}`,
      updates,
    );
    return data;
  },
  async remove(organizationId: string, ticketId: string) {
    await axiosClient.delete(
      `/organizations/${organizationId}/tickets/${ticketId}`,
    );
  },
};
