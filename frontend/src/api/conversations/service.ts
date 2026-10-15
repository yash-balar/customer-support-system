import { axiosClient } from "../axiosClient";
import type { Conversation, Message } from "../../types";

export const conversationsService = {
  async list(organizationId: string) {
    const { data } = await axiosClient.get<{ conversations: Conversation[] }>(
      `/organizations/${organizationId}/conversations`,
    );
    return data;
  },
  async create(
    organizationId: string,
    values: { subject: string; customerName: string; customerEmail: string },
  ) {
    const { data } = await axiosClient.post<{ conversation: Conversation }>(
      `/organizations/${organizationId}/conversations`,
      values,
    );
    return data;
  },
  async listMessages(organizationId: string, conversationId: string) {
    const { data } = await axiosClient.get<{ messages: Message[] }>(
      `/organizations/${organizationId}/conversations/${conversationId}/messages`,
    );
    return data;
  },
  async createMessage(
    organizationId: string,
    conversationId: string,
    body: string,
  ) {
    const { data } = await axiosClient.post<{ message: Message }>(
      `/organizations/${organizationId}/conversations/${conversationId}/messages`,
      { body },
    );
    return data;
  },
  async update(
    organizationId: string,
    conversationId: string,
    values: { status?: string; assigneeId?: string | null },
  ) {
    const { data } = await axiosClient.patch(
      `/organizations/${organizationId}/conversations/${conversationId}`,
      values,
    );
    return data;
  },
};
