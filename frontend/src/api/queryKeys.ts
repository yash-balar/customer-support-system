export const queryKeys = {
  organizations: ["organizations"] as const,
  invitations: (userId?: string) => ["invitations", userId] as const,
  tickets: (organizationId: string, filters: string) =>
    ["tickets", organizationId, filters] as const,
  ticket: (organizationId: string, ticketId: string) =>
    ["ticket", organizationId, ticketId] as const,
  conversations: (organizationId: string) =>
    ["conversations", organizationId] as const,
  messages: (organizationId: string, conversationId: string) =>
    ["messages", organizationId, conversationId] as const,
  members: (organizationId: string) => ["members", organizationId] as const,
  audit: (organizationId: string) => ["audit", organizationId] as const,
};
