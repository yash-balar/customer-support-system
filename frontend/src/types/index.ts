import type { Role } from "../constants/authorization";

export type { Role } from "../constants/authorization";
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface Organization {
  _id: string;
  name: string;
  role?: Role;
  settings?: { supportEmail?: string; timezone?: string };
}

export interface Member {
  _id: string;
  userId: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
}

export interface Ticket {
  _id: string;
  title: string;
  customerName: string;
  customerEmail: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  organizationId: string;
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  status: TicketStatus;
  assigneeId: string | null;
  creatorId: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface AuditEntry {
  _id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
